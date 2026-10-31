"""Data ingestion + alert endpoints (Phase 1 data loop).

Everything under ``/api/v1``. These endpoints persist real data collected
from sensors, IMD weather feeds and citizen/field reports, and let the model
scorer consume it.

IoT stations (ESP32 + soil-moisture/temperature sensors, see
``doc/IOT_INTEGRATION.md``) push to ``/sensors/readings`` (single) or
``/sensors/readings/batch`` (one HTTP call per wake cycle). Set the env var
``SENSOR_INGEST_TOKEN`` to require ``X-Sensor-Token: <token>`` (or
``?token=``) on those endpoints; with no token configured they stay open,
exactly as before.
"""
from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import desc, select

from .. import inputs, models, scorer, sensors, zones
from ..db import get_session
from ..providers import imd as imd_provider
from ..providers import notify as notify_provider
from ..i18n import get_alert_content, SUPPORTED_LANGUAGES

router = APIRouter(prefix="/api/v1")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# --------------------------------------------------------------------------
# schemas
# --------------------------------------------------------------------------
class SensorReadingCreate(BaseModel):
    sensor_id: str
    zone_id: str
    sensor_type: str = Field(
        description="rainfall | soil_moisture | tilt | temperature | seismic"
    )
    value: float
    unit: str = ""
    recorded_at: Optional[datetime] = None
    # Optional station metadata — lets a GPS-less station inherit the laptop
    # position and appear as one station instead of one row per channel.
    station_id: Optional[str] = None
    station_name: Optional[str] = None
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    location_source: Optional[str] = None
    location_accuracy_m: Optional[float] = Field(default=None, ge=0)
    battery_level: Optional[float] = Field(default=None, ge=0, le=100)


class ZoneInputUpdate(BaseModel):
    rain_mm: Optional[float] = Field(default=None, ge=0)
    wetness: Optional[float] = Field(default=None, ge=0, le=1)


class ImdRows(BaseModel):
    rows: list[dict]


class SensorReadingBatch(BaseModel):
    """One HTTP call carrying every reading from an IoT wake cycle.

    ``station`` is optional station metadata (id/name/own GPS) so a unit with
    an on-board GPS module can publish its own coordinates; without it the
    laptop GPS fallback is used.
    """

    readings: list[SensorReadingCreate] = Field(min_length=1, max_length=50)
    station: Optional[dict] = None


class StationInfo(BaseModel):
    """Station metadata sent by the browser bridge (USB serial) or a station."""

    station_id: str = Field(min_length=1, max_length=64)
    name: Optional[str] = Field(default=None, max_length=128)
    zone_id: Optional[str] = None
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    location_source: Optional[str] = None
    location_accuracy_m: Optional[float] = Field(default=None, ge=0)
    battery_level: Optional[float] = Field(default=None, ge=0, le=100)


class TelemetryReading(BaseModel):
    sensor_type: str
    value: float
    unit: str = ""
    channel: Optional[str] = None


class StationTelemetry(BaseModel):
    """Batched real readings from one station (no zone id required)."""

    station: StationInfo
    readings: list[TelemetryReading] = Field(min_length=1, max_length=50)


class StationHeartbeat(BaseModel):
    """Laptop GPS / station liveness ping.

    ``station_id`` is optional: with it the position is attached to that
    station; without it the backend only remembers the laptop position as a
    fallback for GPS-less stations in the same zone.
    """

    station_id: Optional[str] = Field(default=None, max_length=64)
    name: Optional[str] = Field(default=None, max_length=128)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    location_source: str = "laptop_gps"
    location_accuracy_m: Optional[float] = Field(default=None, ge=0)
    battery_level: Optional[float] = Field(default=None, ge=0, le=100)


class ReportCreate(BaseModel):
    reporterName: str
    reporterPhone: Optional[str] = None
    type: str  # IncidentType
    district: str
    state: Optional[str] = None
    description: str = ""
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    mediaUrls: list[str] = []


class ReportUpdate(BaseModel):
    status: Optional[str] = None
    description: Optional[str] = None


def _report_to_dict(report: models.CitizenReport) -> dict:
    import json as _json

    try:
        media = _json.loads(report.media_urls or "[]")
    except ValueError:
        media = []
    return {
        "id": report.id,
        "reporterName": report.reporter_name,
        "reporterPhone": report.reporter_phone,
        "type": report.incident_type,
        "district": report.district,
        "state": report.state,
        "description": report.description,
        "latitude": report.latitude,
        "longitude": report.longitude,
        "status": report.status,
        "images": media,
        "createdAt": report.created_at.isoformat(),
        "updatedAt": report.updated_at.isoformat(),
    }


def _alert_to_dict(alert: models.AlertRecord) -> dict:
    try:
        translations = json.loads(alert.translations or "{}")
    except ValueError:
        translations = {}
    return {
        "id": alert.id,
        "title": alert.title,
        "message": alert.message,
        "severity": alert.severity,
        "district": alert.district,
        "state": alert.state,
        "status": alert.status,
        "source": alert.source,
        "translations": translations,
        "createdAt": alert.created_at.isoformat(),
        "updatedAt": alert.updated_at.isoformat(),
    }


# --------------------------------------------------------------------------
# sensor readings
# --------------------------------------------------------------------------
def _require_ingest_token(
    x_sensor_token: Optional[str] = Header(default=None),
    token: Optional[str] = Query(default=None),
) -> None:
    """Optional shared-secret for IoT pushes (env SENSOR_INGEST_TOKEN).

    No env var configured -> ingestion stays open (existing behaviour).
    """
    expected = os.environ.get("SENSOR_INGEST_TOKEN", "").strip()
    if not expected:
        return
    if x_sensor_token == expected or token == expected:
        return
    raise HTTPException(status_code=401, detail="Invalid or missing sensor ingest token")


def _register_reading_station(
    payload: SensorReadingCreate, station_info: Optional[StationInfo] = None
) -> None:
    """Register/refresh the station that owns this reading.

    A sensor without a GPS module inherits the laptop position recorded by the
    browser heartbeat, so it still appears on the GIS map at the demonstrator's
    real location (labelled ``laptop_gps``). A station that reports its own
    GPS always wins over that fallback.
    """
    station_id = (
        (station_info.station_id if station_info else None)
        or payload.station_id
        or sensors.derive_station_id(payload.sensor_id)
    )
    latitude = payload.latitude
    longitude = payload.longitude
    location_source = payload.location_source
    accuracy = payload.location_accuracy_m
    name = payload.station_name
    battery = payload.battery_level
    if station_info is not None:
        name = name or station_info.name
        if latitude is None or longitude is None:
            latitude, longitude = station_info.latitude, station_info.longitude
            location_source = location_source or station_info.location_source
            accuracy = (
                accuracy if accuracy is not None else station_info.location_accuracy_m
            )
        if battery is None:
            battery = station_info.battery_level
    if latitude is None or longitude is None:
        fallback = sensors.fallback_location_for_zone(payload.zone_id)
        if fallback is not None:
            latitude = fallback["latitude"]
            longitude = fallback["longitude"]
            location_source = location_source or fallback["source"]
            accuracy = accuracy if accuracy is not None else fallback["accuracy_m"]
    sensors.register_station(
        station_id,
        name=name,
        zone_id=payload.zone_id,
        latitude=latitude,
        longitude=longitude,
        location_source=location_source,
        location_accuracy_m=accuracy,
        battery_level=battery,
        channels=[(payload.sensor_id, payload.sensor_type, payload.unit)],
    )


def _store_reading(payload: SensorReadingCreate) -> str | None:
    """Persist one reading; returns an error string for invalid zone ids."""
    if zones.zone_by_id(payload.zone_id) is None:
        return f"Unknown zone_id: {payload.zone_id}"
    reading = models.SensorReading(
        sensor_id=payload.sensor_id,
        zone_id=payload.zone_id,
        sensor_type=payload.sensor_type,
        value=payload.value,
        unit=payload.unit,
        recorded_at=payload.recorded_at or _utcnow(),
    )
    with get_session() as session:
        session.add(reading)
        session.commit()
    _register_reading_station(payload)
    # soil moisture (percent) -> wetness, rainfall -> rain; feeds the scorer
    inputs.refresh_zone_from_readings(payload.zone_id)
    return None


@router.post("/sensors/readings", dependencies=[Depends(_require_ingest_token)])
def add_reading(payload: SensorReadingCreate) -> dict:
    error = _store_reading(payload)
    if error:
        raise HTTPException(status_code=404, detail=error)
    return {"ok": True, "zone_id": payload.zone_id}


@router.post("/sensors/readings/batch", dependencies=[Depends(_require_ingest_token)])
def add_readings_batch(payload: SensorReadingBatch) -> dict:
    """Store several readings at once (ESP32 posts soil + climate per wake).

    Zone inputs are refreshed once per affected zone, so a batch is cheaper
    than N single calls. Invalid zone ids are reported per row, not fatal.
    """
    stored = 0
    errors: list[str] = []
    zones_touched: set[str] = set()
    station_info: Optional[StationInfo] = None
    if payload.station:
        try:
            station_info = StationInfo(**payload.station)
        except Exception as exc:  # invalid optional metadata must not drop readings
            errors.append(f"Invalid station metadata: {exc}")
    for reading in payload.readings:
        if zones.zone_by_id(reading.zone_id) is None:
            errors.append(f"Unknown zone_id: {reading.zone_id}")
            continue
        stored_reading = models.SensorReading(
            sensor_id=reading.sensor_id,
            zone_id=reading.zone_id,
            sensor_type=reading.sensor_type,
            value=reading.value,
            unit=reading.unit,
            recorded_at=reading.recorded_at or _utcnow(),
        )
        with get_session() as session:
            session.add(stored_reading)
            session.commit()
        _register_reading_station(reading, station_info)
        zones_touched.add(reading.zone_id)
        stored += 1
    for zone_id in zones_touched:
        inputs.refresh_zone_from_readings(zone_id)
    return {"ok": stored > 0, "stored": stored, "errors": errors}


@router.post("/sensors/ingest", dependencies=[Depends(_require_ingest_token)])
def ingest_station_telemetry(payload: StationTelemetry) -> dict:
    """Ingest a batch from one station, resolving its zone from GPS.

    Used by the browser's USB-serial bridge: the ESP32/Arduino sketch prints
    one JSON line per wake cycle, the page pairs it with the laptop's GPS
    position and posts here. ``zone_id`` is optional — when absent the closest
    monitoring zone within 50 km is used, otherwise readings are stored and
    mapped without touching any zone's model inputs.
    """
    info = payload.station
    latitude, longitude = info.latitude, info.longitude
    if latitude is None or longitude is None:
        fallback = sensors.get_laptop_location()
        if fallback is not None:
            latitude = fallback["latitude"]
            longitude = fallback["longitude"]
            info.location_source = info.location_source or fallback["source"]
            info.location_accuracy_m = (
                info.location_accuracy_m
                if info.location_accuracy_m is not None
                else fallback["accuracy_m"]
            )

    zone_id = sensors.zone_for_position(latitude, longitude, info.zone_id)
    channels: list[tuple[str, str, str]] = []
    recorded_at = _utcnow()
    with get_session() as session:
        for reading in payload.readings:
            sensor_id = reading.channel or sensors.channel_id(
                info.station_id, reading.sensor_type
            )
            session.add(
                models.SensorReading(
                    sensor_id=sensor_id,
                    zone_id=zone_id,
                    sensor_type=reading.sensor_type,
                    value=reading.value,
                    unit=reading.unit,
                    recorded_at=recorded_at,
                )
            )
            channels.append((sensor_id, reading.sensor_type, reading.unit))
        session.commit()

    station = sensors.register_station(
        info.station_id,
        name=info.name,
        zone_id=zone_id,
        latitude=latitude,
        longitude=longitude,
        location_source=info.location_source,
        location_accuracy_m=info.location_accuracy_m,
        battery_level=info.battery_level,
        channels=channels,
    )
    if zone_id:
        inputs.refresh_zone_from_readings(zone_id)
    return {
        "ok": True,
        "stored": len(channels),
        "zoneId": zone_id,
        "station": station,
    }


@router.post("/sensors/heartbeat", dependencies=[Depends(_require_ingest_token)])
def station_heartbeat(payload: StationHeartbeat) -> dict:
    """Laptop GPS ping / station liveness.

    Records the laptop position (browser geolocation or manual entry) so a
    GPS-less station can inherit it, and refreshes the station's last-seen
    time so the dashboard's online count is driven by reality.
    """
    laptop = sensors.record_laptop_location(
        payload.latitude,
        payload.longitude,
        accuracy_m=payload.location_accuracy_m,
        source=payload.location_source or "laptop_gps",
    )
    # Keep any GPS-less station marker at the current laptop position, without
    # waiting for its next reading cycle.
    sensors.sync_stations_to_laptop(laptop)
    station = None
    if payload.station_id:
        station = sensors.register_station(
            payload.station_id,
            name=payload.name,
            zone_id=laptop.get("zone_id") or "",
            latitude=payload.latitude,
            longitude=payload.longitude,
            location_source=payload.location_source or "laptop_gps",
            location_accuracy_m=payload.location_accuracy_m,
            battery_level=payload.battery_level,
        )
    return {
        "ok": True,
        "latitude": laptop["latitude"],
        "longitude": laptop["longitude"],
        "zoneId": laptop.get("zone_id", ""),
        "zoneName": laptop.get("zone_name"),
        "distanceKm": laptop.get("distance_km"),
        "accuracyM": laptop.get("accuracy_m"),
        "recordedAt": laptop["recorded_at"].isoformat(),
        "station": station,
    }


@router.get("/sensors/readings")
def list_readings(
    zone_id: Optional[str] = None,
    sensor_id: Optional[str] = None,
    limit: int = Query(default=200, le=2000),
) -> list[dict]:
    statement = select(models.SensorReading).order_by(
        desc(models.SensorReading.recorded_at)
    )
    if zone_id:
        statement = statement.where(models.SensorReading.zone_id == zone_id)
    if sensor_id:
        statement = statement.where(models.SensorReading.sensor_id == sensor_id)
    with get_session() as session:
        rows = session.scalars(statement.limit(limit)).all()
    return [
        {
            "sensor_id": r.sensor_id,
            "zone_id": r.zone_id,
            "sensor_type": r.sensor_type,
            "value": r.value,
            "unit": r.unit,
            "recorded_at": r.recorded_at.isoformat(),
        }
        for r in rows
    ]


# --------------------------------------------------------------------------
# live zone inputs (feed the model scorer)
# --------------------------------------------------------------------------
@router.get("/zones/inputs")
def list_zone_inputs() -> list[dict]:
    with get_session() as session:
        rows = session.scalars(select(models.ZoneInput)).all()
    return [
        {
            "zone_id": row.zone_id,
            "rain_mm": row.rain_mm,
            "wetness": row.wetness,
            "source": row.source,
            "recorded_at": row.recorded_at.isoformat() if row.recorded_at else None,
        }
        for row in rows
    ]


@router.put("/zones/{zone_id}/input")
def set_zone_input(zone_id: str, payload: ZoneInputUpdate) -> dict:
    zone = zones.zone_by_id(zone_id)
    if zone is None:
        raise HTTPException(status_code=404, detail="Unknown zone_id")
    inputs.set_live(
        zone_id,
        rain_mm=payload.rain_mm,
        wetness=payload.wetness,
        source="manual",
    )
    return {"ok": True, "zone_id": zone_id}


# --------------------------------------------------------------------------
# IMD district rainfall feed
# --------------------------------------------------------------------------
@router.post("/data/imd")
def ingest_imd_rows(payload: ImdRows) -> dict:
    return imd_provider.ingest_district_rainfall(payload.rows)


@router.get("/data/imd/pull")
def pull_imd() -> dict:
    """Fetch IMD rainfall from the configured source and store it."""
    try:
        rows = imd_provider.fetch_district_rainfall()
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return imd_provider.ingest_district_rainfall(rows)


# --------------------------------------------------------------------------
# citizen / field reports
# --------------------------------------------------------------------------
@router.post("/reports", status_code=201)
def create_report(payload: ReportCreate) -> dict:
    import json as _json

    report = models.CitizenReport(
        id=f"cr-{uuid.uuid4().hex[:8]}",
        reporter_name=payload.reporterName,
        reporter_phone=payload.reporterPhone,
        incident_type=payload.type,
        district=payload.district,
        state=payload.state or "",
        description=payload.description,
        latitude=payload.latitude,
        longitude=payload.longitude,
        status="pending",
        media_urls=_json.dumps(payload.mediaUrls),
    )
    with get_session() as session:
        session.add(report)
        session.commit()
    return _report_to_dict(report)


@router.get("/reports")
def list_reports(
    status: Optional[str] = None,
    district: Optional[str] = None,
    limit: int = Query(default=200, le=2000),
) -> list[dict]:
    statement = select(models.CitizenReport).order_by(
        desc(models.CitizenReport.created_at)
    )
    if status:
        statement = statement.where(models.CitizenReport.status == status)
    if district:
        statement = statement.where(models.CitizenReport.district == district)
    with get_session() as session:
        rows = session.scalars(statement.limit(limit)).all()
        return [_report_to_dict(r) for r in rows]


@router.patch("/reports/{report_id}")
def update_report(report_id: str, payload: ReportUpdate) -> dict:
    with get_session() as session:
        report = session.get(models.CitizenReport, report_id)
        if report is None:
            raise HTTPException(status_code=404, detail="Report not found")
        if payload.status is not None:
            report.status = payload.status
        if payload.description is not None:
            report.description = payload.description
        report.updated_at = _utcnow()
        session.commit()
        result = _report_to_dict(report)
    return result


# --------------------------------------------------------------------------
# alerts
# --------------------------------------------------------------------------
@router.get("/alerts")
def list_alerts(
    severity: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(default=100, le=500),
) -> list[dict]:
    statement = select(models.AlertRecord).order_by(
        desc(models.AlertRecord.created_at)
    )
    if severity:
        statement = statement.where(models.AlertRecord.severity == severity)
    if status:
        statement = statement.where(models.AlertRecord.status == status)
    with get_session() as session:
        rows = session.scalars(statement.limit(limit)).all()
        return [_alert_to_dict(r) for r in rows]


@router.post("/ml/evaluate")
def evaluate_alerts() -> dict:
    """Turn current model predictions into raised alerts.

    Thresholds follow the severity bands: severe -> emergency, high ->
    critical. One active alert per zone is kept (no duplicates on repeat
    evaluation). Replace the delivery stub with an SMS/WhatsApp adapter to
    close the predict->warn loop.
    """
    records = scorer.predictions()
    created: list[dict] = []
    skipped = 0
    with get_session() as session:
        existing = {
            (a.zone_id, a.status)
            for a in session.scalars(
                select(models.AlertRecord).where(
                    models.AlertRecord.status == "active"
                )
            ).all()
        }
        for record in records:
            severity = record["severity"]
            if severity == "severe":
                alert_severity = "emergency"
            elif severity == "high":
                alert_severity = "critical"
            else:
                continue
            if (record["zoneId"], "active") in existing:
                skipped += 1
                continue
            zone = zones.zone_by_id(record["zoneId"])
            probability_str = f"{record['probability']:.0%}"
            translations = get_alert_content(
                alert_severity, record["zoneName"], record["district"], probability_str
            )
            alert = models.AlertRecord(
                id=f"al-{uuid.uuid4().hex[:8]}",
                title=translations["en"]["title"],
                message=translations["en"]["message"],
                severity=alert_severity,
                district=record["district"],
                state=zone["state"] if zone else "",
                zone_id=record["zoneId"],
                status="active",
                source="ML Prediction Service (LHASA)",
                created_at=_utcnow(),
                updated_at=_utcnow(),
                translations=json.dumps(translations),
            )
            session.add(alert)
            existing.add((record["zoneId"], "active"))
            created.append(_alert_to_dict(alert))
        session.commit()

    # Fan the new alerts out through the configured delivery channel
    # (log-only by default; Twilio/MSG91/webhook when env vars are set —
    # see backend/app/providers/notify.py and doc/INDIA_LIVE_DATA_APIS.md).
    deliveries = [notify_provider.send_alert(alert) for alert in created]
    return {
        "created": created,
        "skipped_duplicates": skipped,
        "deliveries": deliveries,
    }
