"""Generate a risk heatmap grid by scoring the LHASA model at grid points.

The model needs terrain features (Lithology, Slope, pga, gwetprof, antecedent,
rain). Without raster inputs we estimate them per grid cell from simple
geographic heuristics and live zone data where available. The result is a
coarse but model-derived risk surface that the GIS heatmap layer renders.
"""
from __future__ import annotations

import math

import numpy as np
import xgboost as xgb

from . import config, inputs, zones

MODEL_FEATURES = ["Lithology", "Slope", "pga", "gwetprof", "antecedent", "rain"]

# Rough terrain heuristics for the NER region. Southern lowlands
# (lat < 23) are flatter; the Himalayan front (25-28) is steep;
# the plateau/shelf is moderate.
def _estimate_terrain(lat: float, lon: float) -> tuple[int, float, float]:
    """Estimate (lithology, slope_deg, pga) from position."""
    # Lithology codes: 4 (red laterite, Tripura/Assam plains)
    # 5 (sandstone/shale mix, mid-NE)
    # 6 (phyllite/schist, Himalayan front)
    # 7 (gneiss, high mountains)
    if lat > 27.5:
        lithology, slope, pga = 7, 34, 0.02
    elif lat > 26:
        lithology, slope, pga = 6, 30, 0.015
    elif lat > 24.5:
        lithology, slope, pga = 6, 26, 0.01
    elif lat > 23:
        lithology, slope, pga = 5, 22, 0.008
    else:
        lithology, slope, pga = 4, 14, 0.005
    # Nudged by longitude (westerly areas slightly wetter/higher)
    if lon < 92:
        slope += 2
    return lithology, slope, pga


def _wetness_and_rain(lat: float, lon: float) -> tuple[float, float]:
    """Best available wetness/rain: live zone data, then rough default."""
    nearest = min(
        zones.MONITORING_ZONES,
        key=lambda z: math.hypot(z["latitude"] - lat, z["longitude"] - lon),
    )
    live = inputs.get_live(nearest["id"])
    if live and live.get("rain") is not None:
        return live.get("wetness", 0.35), live["rain"]
    # Default: moderate monsoon conditions, slightly reduced by distance from
    # the worst-hit zones.
    dist = math.hypot(
        nearest["latitude"] - lat, nearest["longitude"] - lon
    )
    factor = max(0.4, 1.0 - dist * 0.15)
    wetness = 0.30 * factor + 0.05
    rain = 35 * factor + 3
    return wetness, rain


def build_grid(
    north: float | None = None,
    south: float | None = None,
    east: float | None = None,
    west: float | None = None,
    step: float = 0.25,
) -> list[dict]:
    """Return a list of {lat, lon, p} heatmap points across the study area."""
    bbox = config.DEFAULT_BBOX
    north = north or bbox["north"]
    south = south or bbox["south"]
    east = east or bbox["east"]
    west = west or bbox["west"]

    # Build a feature matrix for the full grid.
    lats = np.arange(south + step / 2, north, step)
    lons = np.arange(west + step / 2, east, step)
    rows: list[list[float]] = []
    coords: list[tuple[float, float]] = []
    for lat in lats:
        for lon in lons:
            lith, slope, pga = _estimate_terrain(lat, lon)
            wetness, rain = _wetness_and_rain(lat, lon)
            rows.append([lith, slope, pga, wetness, rain * 2, rain])
            coords.append((round(float(lat), 3), round(float(lon), 3)))

    matrix = xgb.DMatrix(np.array(rows), feature_names=MODEL_FEATURES)

    model_file = config.MODEL_FILE
    if not model_file.exists():
        return []

    booster = xgb.Booster()
    booster.load_model(str(model_file))
    booster.set_param("nthread", 2)

    probs = booster.predict(matrix)
    points: list[dict] = []
    for (lat, lon), prob in zip(coords, probs):
        if prob >= 0.05:  # skip very low-risk cells
            points.append(
                {"lat": lat, "lon": lon, "p": round(float(prob), 4)}
            )
    return points
