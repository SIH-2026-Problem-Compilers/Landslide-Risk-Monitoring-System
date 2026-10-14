"""Generate a risk heatmap grid by scoring the LHASA model at grid points.

The model needs terrain features (Lithology, Slope, pga, gwetprof, antecedent,
rain). Without raster inputs we estimate them per grid cell from simple
geographic heuristics (all-India regions) and live zone data where
available. The result is a coarse but model-derived risk surface that the
GIS heatmap layer renders.
"""
from __future__ import annotations

import math

import numpy as np
import xgboost as xgb

from . import config, inputs, zones

MODEL_FEATURES = ["Lithology", "Slope", "pga", "gwetprof", "antecedent", "rain"]

# Rough terrain heuristics for the all-India hazard belt. Ordered rules:
# high Himalaya -> sub-Himalaya -> NE plateau -> plains -> Western Ghats ->
# Deccan -> Gujarat/west. Lithology codes are the same rough classes the
# scorer uses (4 laterite/basalt, 5 sandstone/shale, 6 phyllite/schist,
# 7 gneiss/high mountains).
def _estimate_terrain(lat: float, lon: float) -> tuple[int, float, float]:
    """Estimate (lithology, slope_deg, pga) from position over India."""
    # High Himalaya + Kashmir (steep, high seismicity)
    if lat >= 30.0 and 73.0 <= lon <= 97.5:
        return 7, 36, 0.50
    # Himachal/Uttarakhand foothills, Nepal border, Darjeeling sub-Himalaya
    if 26.0 <= lat < 30.0 and 73.0 <= lon <= 89.0:
        return 6, 29, 0.42
    # North East India (Shillong plateau, Arunachal, Manipur/Naga hills)
    if 21.0 <= lat < 28.0 and 89.0 <= lon <= 97.5:
        return 5, 27, 0.40
    # Indo-Gangetic / Brahmaputra plains (low hazard baseline)
    if 21.0 <= lat < 26.0 and 73.0 <= lon <= 89.0:
        return 4, 6, 0.12
    # Western Ghats escarpment (lon band through Kerala/Karnataka/Maharashtra)
    if 7.0 <= lat < 23.0 and 72.5 <= lon <= 78.0:
        return 5, 27, 0.08
    # Deccan plateau / central India
    if 12.0 <= lat < 23.0 and 73.0 <= lon <= 85.0:
        return 4, 15, 0.07
    # Southern peninsula (Nilgiris, Eastern Ghats)
    if lat < 12.0 and 74.0 <= lon <= 80.0:
        return 4, 14, 0.06
    # Gujarat / arid west
    if lon < 73.0:
        return 4, 10, 0.15
    return 5, 20, 0.20


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
