"""Open-Meteo weather provider for NER monitoring zones.

Open-Meteo (https://open-meteo.com) is a free, open-source weather API that
requires no API key and offers sub-daily ECMWF forecast data including:
  - precipitation_sum        (mm / day)
  - soil_moisture_0_to_7cm   (m³/m³, converted to 0-1 wetness fraction)

We query the hourly endpoint for each monitoring zone and store the results
as ZoneInput rows so the LHASA scorer picks them up on the next prediction.

Environment variables:
  OPEN_METEO_URL   Base URL (default https://api.open-meteo.com)

Usage (called by the ingest router or the startup scheduler):
    from backend.app.providers import openmeteo
    result = openmeteo.ingest_all_zones()
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

from .. import inputs, zones

OPEN_METEO_BASE = os.environ.get("OPEN_METEO_URL", "https://api.open-meteo.com").rstrip("/")
REQUEST_TIMEOUT = 15  # seconds


def _fetch_zone(lat: float, lon: float) -> dict | None:
    """Fetch current-day precipitation and soil moisture for one lat/lon."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    params = urllib.parse.urlencode(
        {
            "latitude": lat,
            "longitude": lon,
            "daily": "precipitation_sum",
            "hourly": "soil_moisture_0_to_7cm",
            "timezone": "auto",
            "start_date": today,
            "end_date": today,
        }
    )
    url = f"{OPEN_METEO_BASE}/v1/forecast?{params}"
    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        return data
    except (urllib.error.URLError, json.JSONDecodeError, OSError):
        return None


def _extract_rain_and_wetness(data: dict) -> tuple[float | None, float | None]:
    """Pull today's total rain (mm) and mean soil wetness (0-1) from the response."""
    rain: float | None = None
    wetness: float | None = None

    # daily precipitation_sum is a list with one value for today
    daily = data.get("daily", {})
    precip_list = daily.get("precipitation_sum", [])
    if precip_list:
        try:
            rain = float(precip_list[0]) if precip_list[0] is not None else None
        except (TypeError, ValueError):
            rain = None

    # hourly soil_moisture_0_to_7cm — take the mean of non-null values
    hourly = data.get("hourly", {})
    sm_list = hourly.get("soil_moisture_0_to_7cm", [])
    valid = [float(v) for v in sm_list if v is not None]
    if valid:
        # m³/m³ typical range is ~0.02–0.60; scale to 0–1 by dividing by 0.6
        raw_mean = sum(valid) / len(valid)
        wetness = min(1.0, raw_mean / 0.6)

    return rain, wetness


def ingest_zone(zone_id: str, lat: float, lon: float) -> dict:
    """Fetch and store live weather inputs for one zone. Returns a status dict."""
    data = _fetch_zone(lat, lon)
    if data is None:
        return {"zone_id": zone_id, "status": "fetch_failed", "rain_mm": None, "wetness": None}

    rain, wetness = _extract_rain_and_wetness(data)
    if rain is None and wetness is None:
        return {"zone_id": zone_id, "status": "no_data", "rain_mm": None, "wetness": None}

    inputs.set_live(zone_id, rain_mm=rain, wetness=wetness, source="open-meteo")
    return {"zone_id": zone_id, "status": "ok", "rain_mm": rain, "wetness": wetness}


def ingest_all_zones() -> dict:
    """Fetch Open-Meteo data for every NER monitoring zone and store results.

    Returns a summary dict with per-zone status.
    """
    results = []
    for zone in zones.MONITORING_ZONES:
        result = ingest_zone(zone["id"], zone["latitude"], zone["longitude"])
        results.append(result)

    ok = [r for r in results if r["status"] == "ok"]
    failed = [r for r in results if r["status"] != "ok"]
    return {
        "total": len(results),
        "updated": len(ok),
        "failed": len(failed),
        "zones": results,
    }
