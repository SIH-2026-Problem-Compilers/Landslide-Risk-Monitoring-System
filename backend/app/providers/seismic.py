"""Live seismicity for India from the USGS earthquake feed (no API key).

Seismic preconditioning is one of LHASA's six model inputs (``pga``), so real
earthquake activity next to a monitored zone is directly relevant to
landslide risk. The USGS GeoJSON feeds are free, public and updated
continuously — no registration, no key.

Environment variables:
  USGS_FEED_URL  override the feed (default: USGS "all earthquakes, past week",
                 https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson)
  USGS_BBOX      comma-separated "west,south,east,north" clip box
                 (defaults to the project's all-India DEFAULT_BBOX)

Usage (called by the live router):
    from backend.app.providers import seismic
    events = seismic.recent_earthquakes()
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from datetime import datetime, timezone

from .. import config

USGS_FEED = os.environ.get(
    "USGS_FEED_URL",
    # 7-day feed: the past-day feed is often empty over the India bbox
    # (no M2.5+ events in 24h), which would render the map layer blank.
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson",
)
_bbox_env = os.environ.get("USGS_BBOX", "").strip()
if _bbox_env:
    _W, _S, _E, _N = (float(v) for v in _bbox_env.split(","))
else:
    _W = config.DEFAULT_BBOX["west"]
    _S = config.DEFAULT_BBOX["south"]
    _E = config.DEFAULT_BBOX["east"]
    _N = config.DEFAULT_BBOX["north"]

REQUEST_TIMEOUT = 12  # seconds


def _fetch_feed() -> dict | None:
    try:
        req = urllib.request.Request(
            USGS_FEED, headers={"Accept": "application/json", "User-Agent": "lhasa-india/1.0"}
        )
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, json.JSONDecodeError, OSError):
        return None


def recent_earthquakes(min_magnitude: float = 2.5) -> dict:
    """Earthquakes in the study area from the USGS feed.

    Returns {"source", "fetchedAt", "count", "events": [...]} with events
    clipped to the India bbox and sorted newest first. Empty list when the
    feed is unreachable (callers fall back to static data).
    """
    data = _fetch_feed()
    now = datetime.now(timezone.utc).isoformat()
    if data is None:
        return {"source": USGS_FEED, "fetchedAt": now, "count": 0, "events": []}

    events: list[dict] = []
    for feature in data.get("features", []):
        props = feature.get("properties", {})
        geometry = feature.get("geometry", {}) or {}
        coords = geometry.get("coordinates") or [None, None, None]
        lon, lat, depth = coords[0], coords[1], coords[2]
        magnitude = props.get("mag")
        if lat is None or lon is None or magnitude is None:
            continue
        if magnitude < min_magnitude:
            continue
        if not (_W <= float(lon) <= _E and _S <= float(lat) <= _N):
            continue
        ts = props.get("time")
        events.append(
            {
                "id": feature.get("id", ""),
                "magnitude": round(float(magnitude), 1),
                "place": props.get("place") or "",
                "latitude": round(float(lat), 4),
                "longitude": round(float(lon), 4),
                "depthKm": round(float(depth), 1) if depth is not None else None,
                "timestamp": datetime.fromtimestamp(
                    ts / 1000, tz=timezone.utc
                ).isoformat()
                if ts
                else None,
                "url": props.get("url") or "",
                "tsunami": bool(props.get("tsunami")),
            }
        )
    events.sort(key=lambda e: e["timestamp"] or "", reverse=True)
    return {
        "source": USGS_FEED,
        "fetchedAt": now,
        "count": len(events),
        "events": events,
    }
