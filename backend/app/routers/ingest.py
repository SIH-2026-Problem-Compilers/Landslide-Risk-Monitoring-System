"""Data ingestion + alert endpoints (Phase 1 data loop).

Everything under ``/api/v1``. These endpoints persist real data collected
from sensors, IMD weather feeds and citizen/field reports, and let the model
scorer consume it.
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import desc, select

from .. import inputs, models, scorer, zones
from ..db import get_session
from ..providers import imd as imd_provider
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


class ZoneInputUpdate(BaseModel):
    rain_mm: Optional[float] = Field(default=None, ge=0)
    wetness: Optional[float] = Field(default=None, ge=0, le=1)


class ImdRows(BaseModel):
    rows: list[dict]


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
@router.post("/sensors/readings")
def add_reading(payload: SensorReadingCreate) -> dict:
    zone = zones.zone_by_id(payload.zone_id)
    if zone is None:
        raise HTTPException(status_code=404, detail="Unknown zone_id")
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
    inputs.refresh_zone_from_readings(payload.zone_id)
    return {"ok": True, "zone_id": payload.zone_id}


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
    return {"created": created, "skipped_duplicates": skipped}
