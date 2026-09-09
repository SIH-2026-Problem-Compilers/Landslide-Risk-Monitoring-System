"""Live per-zone model inputs (rain mm + soil wetness).

The model scorer normally uses the calibrated sample table in ``scorer.py``.
Whenever real data arrives — sensor readings pushed by IoT gateways or IMD
district rainfall ingested by the weather feed — it is stored as a per-zone
``ZoneInput`` and takes precedence over the samples on the next prediction.
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select

from .db import get_session
from .models import SensorReading, ZoneInput


def get_live(zone_id: str) -> dict | None:
    """Latest stored live inputs for a zone (None if never set)."""
    try:
        with get_session() as session:
            row = session.get(ZoneInput, zone_id)
    except Exception:
        return None
    if row is None:
        return None
    return {"rain": row.rain_mm, "wetness": row.wetness, "source": row.source}


def set_live(
    zone_id: str,
    rain_mm: float | None = None,
    wetness: float | None = None,
    source: str = "manual",
) -> ZoneInput | None:
    """Upsert the live input row for a zone."""
    with get_session() as session:
        row = session.get(ZoneInput, zone_id)
        if row is None:
            row = ZoneInput(zone_id=zone_id)
            session.add(row)
        if rain_mm is not None:
            row.rain_mm = rain_mm
        if wetness is not None:
            row.wetness = max(0.0, min(1.0, wetness))
        row.source = source
        row.recorded_at = datetime.now(timezone.utc)
        session.commit()
        return row


def refresh_zone_from_readings(zone_id: str) -> None:
    """Recompute a zone's live input from its latest stored sensor readings.

    Rainfall gauges update ``rain``; soil-moisture probes (percent) update
    ``wetness``. Missing sensor types leave the existing value untouched.
    """
    from sqlalchemy import desc

    with get_session() as session:
        readings = session.scalars(
            select(SensorReading)
            .where(SensorReading.zone_id == zone_id)
            .order_by(desc(SensorReading.recorded_at))
            .limit(500)
        ).all()

    rain_value: float | None = None
    wetness_value: float | None = None
    for reading in readings:
        if reading.sensor_type == "rainfall" and rain_value is None:
            rain_value = reading.value
        elif reading.sensor_type == "soil_moisture" and wetness_value is None:
            value = reading.value / 100 if reading.unit == "%" else reading.value
            wetness_value = value

    if rain_value is None and wetness_value is None:
        return
    set_live(
        zone_id,
        rain_mm=rain_value,
        wetness=wetness_value,
        source="sensor",
    )
