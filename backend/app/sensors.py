"""Registry for real sensor stations.

The Sensors page and the GIS map must only ever show stations that actually
reported data. This module is the single place where stations are discovered,
their location is resolved and their online/offline status is computed.

Location resolution order
-------------------------
1. ``sensor_gps``   — coordinates reported by the station itself (GPS module
   or the browser bridge). Never overwritten by a laptop position.
2. ``laptop_gps``   — fallback for stations without a GPS module: the browser
   on the host laptop sends its position and the station inherits it.
3. ``manual``       — coordinates typed in by the demonstrator.
4. ``zone``         — legacy readings with no known position are placed at the
   centre of their monitoring zone and clearly labelled as an estimate.

No synthetic sensor is ever created here: a station only appears after a real
reading push (or, for legacy rows, a real stored reading) exists.
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Iterable

from sqlalchemy import select

from . import zones
from .db import get_session
from .models import SensorReading, SensorStation

# A station is online while its last heartbeat/push is younger than this.
ONLINE_WINDOW = timedelta(minutes=15)
# Between ONLINE_WINDOW and STALE_WINDOW it is shown as "warning".
STALE_WINDOW = timedelta(hours=3)
# Laptop GPS may stand in for a sensor without GPS for this long.
LAPTOP_FALLBACK_MAX_AGE = timedelta(minutes=10)
# Only associate a reading with a monitoring zone when it is genuinely close;
# otherwise a laptop far from the hazard belt would distort that zone's model.
MAX_ZONE_DISTANCE_KM = 50.0

# Channel suffixes some firmware appends to the station id (ESP32-A01-SOIL).
_KNOWN_SUFFIXES = {
    "SOIL",
    "SOILMOISTURE",
    "MOISTURE",
    "RAIN",
    "RAINFALL",
    "TEMP",
    "TEMPERATURE",
    "HUM",
    "HUMIDITY",
    "TILT",
    "SEISMIC",
    "BATTERY",
    "BATT",
}

_TYPE_LABELS = {
    "soil_moisture": "Soil moisture",
    "rainfall": "Rainfall",
    "temperature": "Temperature",
    "humidity": "Humidity",
    "tilt": "Tilt",
    "seismic": "Seismic",
    "battery": "Battery",
}

_DEFAULT_UNITS = {
    "soil_moisture": "%",
    "rainfall": "mm",
    "temperature": "°C",
    "humidity": "%",
    "tilt": "°",
    "seismic": "RMS",
    "battery": "%",
}

# Last laptop position seen by the API (browser heartbeat). Kept in memory:
# the browser re-sends it every poll, so a restart self-heals in < 1 minute.
_laptop_location: dict | None = None


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def as_utc(value: datetime | None) -> datetime | None:
    """SQLite returns naive datetimes; normalise them to UTC-aware."""
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def station_status(last_seen: datetime | None) -> str:
    last = as_utc(last_seen)
    if last is None:
        return "offline"
    age = _utcnow() - last
    if age <= ONLINE_WINDOW:
        return "online"
    if age <= STALE_WINDOW:
        return "warning"
    return "offline"


def derive_station_id(sensor_id: str) -> str:
    """``ESP32-A01-SOIL`` -> ``ESP32-A01``; unknown ids stay untouched."""
    parts = sensor_id.strip().split("-")
    if len(parts) > 1 and parts[-1].upper() in _KNOWN_SUFFIXES:
        return "-".join(parts[:-1])
    return sensor_id.strip()


def channel_id(station_id: str, sensor_type: str) -> str:
    """Stable per-channel sensor id for a station (``ESP32-A01-SOIL``)."""
    suffix = {
        "soil_moisture": "SOIL",
        "rainfall": "RAIN",
        "temperature": "TEMP",
        "humidity": "HUM",
        "tilt": "TILT",
        "seismic": "SEISMIC",
        "battery": "BATT",
    }.get(sensor_type, sensor_type.upper().replace(" ", "_")[:10])
    return f"{station_id}-{suffix}"


def nearest_zone(lat: float, lon: float) -> tuple[dict, float]:
    return zones.nearest_zone(lat, lon)


def zone_for_position(
    lat: float | None, lon: float | None, explicit_zone_id: str | None = None
) -> str:
    """Resolve the monitoring zone a station belongs to.

    An explicit, valid ``zone_id`` always wins. Otherwise the closest zone is
    used only when it is within ``MAX_ZONE_DISTANCE_KM``; readings from far
    away are stored and mapped but do not override any zone's model inputs.
    """
    if explicit_zone_id and zones.zone_by_id(explicit_zone_id) is not None:
        return explicit_zone_id
    if lat is None or lon is None:
        return ""
    zone, distance = nearest_zone(lat, lon)
    if distance <= MAX_ZONE_DISTANCE_KM:
        return zone["id"]
    return ""


# ---------------------------------------------------------------------------
# Laptop GPS fallback
# ---------------------------------------------------------------------------

def record_laptop_location(
    latitude: float,
    longitude: float,
    accuracy_m: float | None = None,
    source: str = "laptop_gps",
) -> dict:
    """Remember the browser/laptop position for sensors that have no GPS."""
    global _laptop_location
    zone, distance = nearest_zone(latitude, longitude)
    _laptop_location = {
        "latitude": float(latitude),
        "longitude": float(longitude),
        "accuracy_m": float(accuracy_m) if accuracy_m is not None else None,
        "source": source,
        "zone_id": zone["id"] if distance <= MAX_ZONE_DISTANCE_KM else "",
        "zone_name": zone["name"],
        "distance_km": round(distance, 1),
        "recorded_at": _utcnow(),
    }
    return dict(_laptop_location)


def get_laptop_location() -> dict | None:
    """Most recent laptop position if it is still fresh, else None."""
    if _laptop_location is None:
        return None
    if _utcnow() - _laptop_location["recorded_at"] > LAPTOP_FALLBACK_MAX_AGE:
        return None
    return dict(_laptop_location)


def laptop_status() -> dict:
    """Public status of the last laptop GPS fix (for the GIS map)."""
    location = get_laptop_location()
    if location is None:
        return {"active": False}
    return {
        "active": True,
        "latitude": location["latitude"],
        "longitude": location["longitude"],
        "accuracyM": location["accuracy_m"],
        "source": location["source"],
        "zoneId": location.get("zone_id", ""),
        "zoneName": location.get("zone_name"),
        "distanceKm": location.get("distance_km"),
        "recordedAt": location["recorded_at"].isoformat(),
    }


def sync_stations_to_laptop(location: dict) -> int:
    """Move GPS-less registered stations to the current laptop position.

    A station that pushed before the browser had a location fix would otherwise
    stay invisible on the GIS map until its next reading cycle. Stations with
    their own GPS (``sensor_gps``) or a zone-centre estimate (``zone``) are
    never moved.
    """
    try:
        with get_session() as session:
            rows = session.scalars(
                select(SensorStation).where(
                    SensorStation.location_source.in_(
                        ("laptop_gps", "manual", "unknown", "")
                    )
                )
            ).all()
            for row in rows:
                row.latitude = location["latitude"]
                row.longitude = location["longitude"]
                row.location_source = location["source"]
                row.location_accuracy_m = location.get("accuracy_m")
                if location.get("zone_id") and not row.zone_id:
                    row.zone_id = location["zone_id"]
            session.commit()
            return len(rows)
    except Exception:
        return 0


def fallback_location_for_zone(zone_id: str | None = None) -> dict | None:
    """Laptop position to use for a station that has no GPS module.

    The station keeps its configured monitoring zone (so model inputs are not
    redirected by the laptop's position); only the map marker falls back to
    the laptop, which is exactly what the field demo needs when the board has
    no GPS receiver.
    """
    return get_laptop_location()


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def _load_channels(raw: str | None) -> list[dict]:
    try:
        parsed = json.loads(raw or "[]")
    except ValueError:
        return []
    return [c for c in parsed if isinstance(c, dict) and c.get("sensor_id")]


def _dump_channels(channels: list[dict]) -> str:
    return json.dumps(channels, separators=(",", ":"))


def _station_dict(row: SensorStation) -> dict:
    return {
        "stationId": row.station_id,
        "name": row.name or row.station_id,
        "zoneId": row.zone_id or "",
        "latitude": row.latitude,
        "longitude": row.longitude,
        "locationSource": row.location_source or "unknown",
        "locationAccuracyM": row.location_accuracy_m,
        "batteryLevel": row.battery_level,
        "firstSeen": as_utc(row.first_seen).isoformat() if row.first_seen else None,
        "lastSeen": as_utc(row.last_seen).isoformat() if row.last_seen else None,
        "status": station_status(row.last_seen),
        "channels": _load_channels(row.channels),
    }


def register_station(
    station_id: str,
    *,
    name: str | None = None,
    zone_id: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    location_source: str | None = None,
    location_accuracy_m: float | None = None,
    battery_level: float | None = None,
    channels: Iterable[tuple[str, str, str]] = (),
    touch: bool = True,
    last_seen: datetime | None = None,
) -> dict | None:
    """Create/update a station. Returns its serialised registry entry."""
    station_id = (station_id or "").strip()
    if not station_id:
        return None
    if name:
        name = name.strip()[:128]

    with get_session() as session:
        row = session.get(SensorStation, station_id)
        now = _utcnow()
        seen = as_utc(last_seen) or now
        if row is None:
            row = SensorStation(
                station_id=station_id,
                first_seen=seen,
                last_seen=seen,
                channels="[]",
            )
            session.add(row)

        if name:
            row.name = name
        if zone_id and zones.zone_by_id(zone_id) is not None:
            row.zone_id = zone_id
        elif row.zone_id is None and zone_id == "":
            row.zone_id = ""

        # Own GPS always wins over a laptop/manual position.
        has_own_gps = (row.location_source or "") == "sensor_gps"
        if latitude is not None and longitude is not None:
            if not (has_own_gps and (location_source or "") != "sensor_gps"):
                row.latitude = float(latitude)
                row.longitude = float(longitude)
                row.location_source = location_source or "sensor_gps"
                row.location_accuracy_m = (
                    float(location_accuracy_m) if location_accuracy_m is not None else None
                )

        if battery_level is not None:
            row.battery_level = max(0.0, min(100.0, float(battery_level)))

        existing = _load_channels(row.channels)
        by_id = {c["sensor_id"]: c for c in existing}
        for sensor_id, sensor_type, unit in channels:
            if not sensor_id:
                continue
            by_id[sensor_id] = {
                "sensor_id": sensor_id,
                "type": sensor_type,
                "unit": unit or _DEFAULT_UNITS.get(sensor_type, ""),
            }
        row.channels = _dump_channels(list(by_id.values()))

        if touch:
            row.last_seen = now
        elif last_seen is not None:
            row.last_seen = seen
        session.commit()
        session.refresh(row)
        return _station_dict(row)


# ---------------------------------------------------------------------------
# Queries
# ---------------------------------------------------------------------------

def _latest_readings(sensor_ids: list[str]) -> dict[str, SensorReading]:
    if not sensor_ids:
        return {}
    with get_session() as session:
        rows = session.scalars(
            select(SensorReading)
            .where(SensorReading.sensor_id.in_(sensor_ids))
            .order_by(SensorReading.recorded_at)
        ).all()
    latest: dict[str, SensorReading] = {}
    for row in rows:
        latest[row.sensor_id] = row
    return latest


def _ensure_legacy_stations() -> None:
    """Register readings that predate the station registry (no data loss)."""
    try:
        with get_session() as session:
            stations = session.scalars(select(SensorStation)).all()
            known = {
                channel["sensor_id"]
                for station in stations
                for channel in _load_channels(station.channels)
            }
            sensor_ids = session.scalars(
                select(SensorReading.sensor_id).distinct()
            ).all()
            missing = [sensor_id for sensor_id in sensor_ids if sensor_id not in known]
            if not missing:
                return
            rows = session.scalars(
                select(SensorReading)
                .where(SensorReading.sensor_id.in_(missing))
                .order_by(SensorReading.recorded_at)
            ).all()
    except Exception:
        return

    grouped: dict[str, dict] = {}
    for row in rows:
        station_id = derive_station_id(row.sensor_id)
        entry = grouped.setdefault(
            station_id,
            {"zone_id": row.zone_id, "channels": {}, "last_seen": row.recorded_at},
        )
        entry["channels"][row.sensor_id] = (row.sensor_id, row.sensor_type, row.unit)
        entry["zone_id"] = row.zone_id
        entry["last_seen"] = row.recorded_at

    for station_id, entry in grouped.items():
        zone = zones.zone_by_id(entry["zone_id"]) if entry["zone_id"] else None
        register_station(
            station_id,
            name=f"{station_id} (historical readings)",
            zone_id=entry["zone_id"],
            latitude=zone["latitude"] if zone else None,
            longitude=zone["longitude"] if zone else None,
            location_source="zone" if zone else None,
            channels=entry["channels"].values(),
            touch=False,
            last_seen=entry["last_seen"],
        )


def list_sensors() -> list[dict]:
    """One row per real sensor channel that has at least one stored reading."""
    _ensure_legacy_stations()
    try:
        with get_session() as session:
            stations = session.scalars(select(SensorStation)).all()
            station_records = [
                (row, _load_channels(row.channels)) for row in stations
            ]
    except Exception:
        return []

    all_channels = [
        channel["sensor_id"]
        for _row, channels in station_records
        for channel in channels
    ]
    latest = _latest_readings(all_channels)

    result: list[dict] = []
    for row, channels in station_records:
        status = station_status(row.last_seen)
        zone = zones.zone_by_id(row.zone_id) if row.zone_id else None
        # Display location follows the real coordinates; the model zone stays
        # ``row.zone_id``. They differ when a GPS-less station falls back to a
        # laptop that is not inside its configured monitoring zone.
        display_zone = zone
        if row.latitude is not None and row.longitude is not None:
            near, distance = nearest_zone(row.latitude, row.longitude)
            display_zone = near if distance <= MAX_ZONE_DISTANCE_KM else None
        station_name = row.name or row.station_id
        multi_channel = len(channels) > 1
        age = None
        if row.last_seen:
            age = int((_utcnow() - as_utc(row.last_seen)).total_seconds())

        for channel in channels:
            reading = latest.get(channel["sensor_id"])
            if reading is None:
                continue
            sensor_type = channel.get("type") or reading.sensor_type
            label = _TYPE_LABELS.get(sensor_type, sensor_type.replace("_", " "))
            name = f"{station_name} · {label}" if multi_channel else station_name
            updated = as_utc(reading.recorded_at) or as_utc(row.last_seen)
            result.append(
                {
                    "id": channel["sensor_id"],
                    "stationId": row.station_id,
                    "name": name,
                    "type": sensor_type,
                    "status": status,
                    "latitude": row.latitude,
                    "longitude": row.longitude,
                    "district": display_zone["district"] if display_zone else "Outside mapped zones",
                    "state": display_zone["state"] if display_zone else "",
                    "zoneId": row.zone_id or "",
                    "lastReading": round(float(reading.value), 2),
                    "unit": channel.get("unit") or reading.unit,
                    "lastUpdated": updated.isoformat() if updated else _utcnow().isoformat(),
                    "ageSeconds": age,
                    "locationSource": row.location_source or "unknown",
                    "locationAccuracyM": row.location_accuracy_m,
                    "isLocal": (row.location_source or "") in ("laptop_gps", "manual"),
                    "batteryLevel": row.battery_level,
                }
            )
    result.sort(key=lambda sensor: (not sensor["isLocal"], sensor["stationId"], sensor["id"]))
    return result


def get_sensor(sensor_id: str) -> dict | None:
    return next((s for s in list_sensors() if s["id"] == sensor_id or s["stationId"] == sensor_id), None)


def online_station_count() -> int:
    """Distinct stations currently online — never a hard-coded number."""
    return len(
        {
            sensor["stationId"]
            for sensor in list_sensors()
            if sensor["status"] == "online"
        }
    )


def station_count() -> int:
    return len({sensor["stationId"] for sensor in list_sensors()})


def status_counts() -> dict[str, int]:
    counts = {"online": 0, "warning": 0, "offline": 0}
    for sensor in list_sensors():
        counts[sensor["status"]] = counts.get(sensor["status"], 0) + 1
    return counts
