"""IMD (India Meteorological Department) district rainfall adapter.

In production set these environment variables:

    IMD_RAINFALL_URL   endpoint returning  [{"district": "...", "rain_mm": 0.0}, ...]
    IMD_API_KEY        optional key, sent as the `Authorization` header
    IMD_API_KEY_HEADER header name to use (default "X-API-Key")

When no URL is configured the adapter falls back to a local JSON file
(``backend/data/imd/rainfall.json``, same shape) so the whole data loop can
be exercised without network access or credentials. IMD's exact endpoints
and keys change; wire the current one per their documentation.
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from pathlib import Path

from .. import config, zones

IMD_URL = os.environ.get("IMD_RAINFALL_URL", "").strip()
IMD_API_KEY = os.environ.get("IMD_API_KEY", "").strip()
IMD_KEY_HEADER = os.environ.get("IMD_API_KEY_HEADER", "X-API-Key").strip()
LOCAL_FEED = config.BACKEND_DIR / "data" / "imd" / "rainfall.json"

_MISSING = object()


def fetch_district_rainfall() -> list[dict]:
    """Fetch district rainfall rows ``[{district, rain_mm}]``.

    Tries the configured IMD endpoint first, then the local JSON feed, then
    raises a descriptive error.
    """
    if IMD_URL:
        request = urllib.request.Request(IMD_URL)
        if IMD_API_KEY:
            request.add_header(IMD_KEY_HEADER, IMD_API_KEY)
        try:
            with urllib.request.urlopen(request, timeout=12) as response:
                payload = json.loads(response.read().decode("utf-8"))
            if isinstance(payload, dict):
                payload = payload.get("data", payload.get("rainfall", []))
            if isinstance(payload, list):
                return payload
        except urllib.error.URLError as exc:
            raise RuntimeError(f"IMD endpoint unreachable ({exc.reason})") from exc

    if LOCAL_FEED.exists():
        return json.loads(LOCAL_FEED.read_text(encoding="utf-8"))

    raise RuntimeError(
        "No IMD data source configured. Set IMD_RAINFALL_URL (+ IMD_API_KEY) "
        f"or place a JSON feed at {LOCAL_FEED}"
    )


def district_to_zone(district: str) -> dict | None:
    """Match an IMD district name to a monitored zone (case-insensitive)."""
    district = district.strip().lower()
    for zone in zones.MONITORING_ZONES:
        if zone["district"].strip().lower() == district:
            return zone
    return None


def ingest_district_rainfall(rows: list[dict]) -> dict:
    """Store one rainfall row per monitored zone; returns ingest stats."""
    from .. import inputs

    matched: list[str] = []
    unmatched: list[str] = []
    for row in rows:
        district = str(row.get("district", "")).strip()
        rain_raw = row.get("rain_mm", row.get("rainfall", row.get("value")))
        zone = district_to_zone(district)
        if zone is None:
            unmatched.append(district)
            continue
        try:
            rain = float(rain_raw)
        except (TypeError, ValueError):
            unmatched.append(district)
            continue
        inputs.set_live(zone["id"], rain_mm=rain, source="imd")
        matched.append(district)
    return {
        "matched_zones": matched,
        "unmatched_districts": sorted(set(unmatched)),
        "count": len(matched),
    }
