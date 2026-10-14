"""Score the real LHASA model with sample inputs when live data isn't reachable.

NASA's LHASA normally runs as a Python pipeline fed by satellite data that
requires an Earthdata account and (for the published map server) IPv6. Until
that is available, this module exercises the *actual* trained XGBoost model
(LHASA/model.json) with clearly-labelled sample inputs for the 27 Indian
monitoring zones (North East + Himalaya + Western Ghats), so the frontend
shows genuine model output instead of mock data.

The sample inputs (soil wetness, rainfall) were calibrated so the real model
produces a realistic spread across the four severity bands. Every record
carries a "Sample inputs" factor so it is never mistaken for a live NASA
nowcast. Set LHASA_DEMO=0 to disable this path; once a real run has
completed, the API serves the real raster results instead.

Since Phase 1, the samples are only a fallback: when real per-zone inputs
are stored (IMD district rainfall feed or IoT sensor readings, see
``app/inputs.py``), they override the samples before scoring.
"""
from __future__ import annotations

import threading
from datetime import datetime, timezone
from typing import Optional

from . import config, inputs
from .output_reader import confidence_for, severity_for
from .zones import MONITORING_ZONES

MODEL_FEATURES = ["Lithology", "Slope", "pga", "gwetprof", "antecedent", "rain"]

# Sample inputs per monitoring zone, calibrated against the real model so the
# 27 zones spread across all four severity bands (2 low / 12 moderate /
# 10 high / 3 severe). rain = current-day rainfall (mm), wetness = soil
# profile wetness 0-1, antecedent = rain * 2 (2-day mm).
# Terrain columns (lithology/slope/pga) are regional estimates; the rain and
# wetness columns are the fallback *weather* state — when real zone inputs
# exist (Open-Meteo / IMD feed / sensor readings, see app/inputs.py) they
# take precedence and the probability moves with actual weather.
ZONE_PARAMS: dict[str, dict] = {
    # ---- North East India (rz-001..rz-013) ----
    "rz-001": {"lithology": 5, "slope": 45.2, "pga": 0.4981, "wetness": 0.30, "rain": 1.5},  # p=0.71 high
    "rz-002": {"lithology": 3, "slope": 11.7, "pga": 0.3564, "wetness": 0.20, "rain": 1.5},  # p=0.42 moderate
    "rz-003": {"lithology": 3, "slope": 32.3, "pga": 0.5424, "wetness": 0.28, "rain": 1.5},  # p=0.69 high
    "rz-004": {"lithology": 4, "slope": 30.4, "pga": 0.6623, "wetness": 0.28, "rain": 1.2},  # p=0.44 moderate
    "rz-005": {"lithology": 5, "slope": 7.2, "pga": 0.525, "wetness": 0.28, "rain": 29.1},   # p=0.76 high
    "rz-006": {"lithology": 4, "slope": 24.6, "pga": 0.4698, "wetness": 0.20, "rain": 1.1},  # p=0.33 moderate
    "rz-007": {"lithology": 3, "slope": 30.9, "pga": 0.5718, "wetness": 0.36, "rain": 2.6},  # p=0.95 severe
    "rz-008": {"lithology": 3, "slope": 38.1, "pga": 0.5398, "wetness": 0.30, "rain": 1.5},  # p=0.71 high
    "rz-009": {"lithology": 4, "slope": 23.5, "pga": 0.559, "wetness": 0.24, "rain": 1.5},   # p=0.62 high
    "rz-010": {"lithology": 4, "slope": 33.3, "pga": 0.5329, "wetness": 0.28, "rain": 0.9},  # p=0.27 moderate
    "rz-011": {"lithology": 5, "slope": 46.1, "pga": 0.3754, "wetness": 0.36, "rain": 2.3},  # p=0.94 severe
    "rz-012": {"lithology": 5, "slope": 40.0, "pga": 0.373, "wetness": 0.22, "rain": 1.0},   # p=0.37 moderate
    "rz-013": {"lithology": 3, "slope": 5.8, "pga": 0.3782, "wetness": 0.15, "rain": 1.2},   # p=0.18 moderate
    # ---- Himachal / Uttarakhand / J&K (rz-014..rz-019) ----
    "rz-014": {"lithology": 6, "slope": 42, "pga": 0.55, "wetness": 0.30, "rain": 1.5},      # p=0.71 high
    "rz-015": {"lithology": 6, "slope": 36, "pga": 0.5, "wetness": 0.20, "rain": 0.6},       # p=0.06 low
    "rz-016": {"lithology": 7, "slope": 38, "pga": 0.6, "wetness": 0.32, "rain": 1.5},      # p=0.71 high
    "rz-017": {"lithology": 7, "slope": 45, "pga": 0.62, "wetness": 0.34, "rain": 1.6},     # p=0.80 high
    "rz-018": {"lithology": 6, "slope": 40, "pga": 0.5, "wetness": 0.25, "rain": 1.0},      # p=0.38 moderate
    "rz-019": {"lithology": 5, "slope": 30, "pga": 0.45, "wetness": 0.15, "rain": 0.6},     # p=0.04 low
    # ---- Darjeeling Himalaya (rz-020..rz-021) ----
    "rz-020": {"lithology": 5, "slope": 38, "pga": 0.35, "wetness": 0.34, "rain": 1.5},      # p=0.71 high
    "rz-021": {"lithology": 5, "slope": 35, "pga": 0.33, "wetness": 0.30, "rain": 1.0},      # p=0.35 moderate
    # ---- Western Ghats (rz-022..rz-027) ----
    "rz-022": {"lithology": 4, "slope": 32, "pga": 0.12, "wetness": 0.35, "rain": 1.2},      # p=0.36 moderate
    "rz-023": {"lithology": 4, "slope": 30, "pga": 0.1, "wetness": 0.32, "rain": 1.5},      # p=0.39 moderate
    "rz-024": {"lithology": 3, "slope": 25, "pga": 0.08, "wetness": 0.40, "rain": 4.7},     # p=0.93 severe
    "rz-025": {"lithology": 4, "slope": 35, "pga": 0.08, "wetness": 0.35, "rain": 1.5},     # p=0.61 high
    "rz-026": {"lithology": 4, "slope": 28, "pga": 0.07, "wetness": 0.32, "rain": 1.5},     # p=0.34 moderate
    "rz-027": {"lithology": 5, "slope": 33, "pga": 0.1, "wetness": 0.30, "rain": 1.5},      # p=0.41 moderate
}

# Relative rain / wetness multipliers per forecast day (relative to today's
# sample state) so the 24h -> 72h outlook visibly trends.
FORECAST_SCENARIOS: dict[str, dict] = {
    "24h": {"rain": 1.35, "wetness": 1.08},
    "48h": {"rain": 0.95, "wetness": 0.92},
    "72h": {"rain": 0.60, "wetness": 0.78},
}

_booster = None
_booster_lock = threading.Lock()


def _model() -> Optional[object]:
    """Load the trained XGBoost booster once (returns None if unavailable)."""
    global _booster
    if _booster is not None:
        return _booster
    with _booster_lock:
        if _booster is not None:
            return _booster
        if not config.MODEL_FILE.exists():
            return None
        import xgboost as xgb

        booster = xgb.Booster()
        booster.load_model(str(config.MODEL_FILE))
        booster.set_param("nthread", 1)
        _booster = booster
        return _booster


def model_ready() -> bool:
    return _model() is not None


def _features_for(zone_id: str, scenario: Optional[str] = None) -> list[float]:
    params = dict(ZONE_PARAMS[zone_id])
    # Live inputs (IMD feed / sensor readings) override the calibrated samples.
    live = inputs.get_live(zone_id)
    if live:
        if live.get("rain") is not None:
            params["rain"] = float(live["rain"])
        if live.get("wetness") is not None:
            params["wetness"] = float(live["wetness"])
    if scenario is None:
        rain_scale = wet_scale = 1.0
    else:
        multipliers = FORECAST_SCENARIOS[scenario]
        rain_scale = multipliers["rain"]
        wet_scale = multipliers["wetness"]
    rain = params["rain"] * rain_scale
    return [
        params["lithology"],
        params["slope"],
        params["pga"],
        max(0.0, min(1.0, params["wetness"] * wet_scale)),
        rain * 2,  # antecedent: 2-day accumulated rainfall
        rain,
    ]


def uses_live_inputs(zone_id: str) -> bool:
    """True when the zone has real (non-sample) rainfall/moisture inputs."""
    live = inputs.get_live(zone_id)
    return bool(live and (live.get("rain") is not None or live.get("wetness") is not None))


def probability_for(zone_id: str, scenario: Optional[str] = None) -> float:
    """Probability from the real model for one zone (0-1)."""
    model = _model()
    if model is None:
        return 0.0
    import xgboost as xgb

    matrix = xgb.DMatrix(
        [_features_for(zone_id, scenario)], feature_names=MODEL_FEATURES
    )
    probability = float(model.predict(matrix)[0])
    if probability != probability:  # NaN guard
        return 0.0
    return max(0.0, min(1.0, probability))


def _factor_list(zone: dict, probability: float, live: bool = False) -> list[str]:
    source = (
        "Live IMD/sensor inputs — real data"
        if live
        else "Sample inputs — demo mode (no live data yet)"
    )
    return [
        f"Rainfall-triggered probability {probability:.0%}",
        f"Zone: {zone['district']}",
        source,
        "Real LHASA model · XGBoost v2.1.1",
    ]


def predictions() -> list[dict]:
    """Prediction records shaped like the frontend Prediction type."""
    now = datetime.now(timezone.utc)
    timestamp = now.isoformat()
    compact = now.strftime("%Y%m%dT%H%M")
    records: list[dict] = []
    for zone in MONITORING_ZONES:
        probability = probability_for(zone["id"])
        records.append(
            {
                "id": f"demo-{zone['id']}-{compact}",
                "zoneId": zone["id"],
                "zoneName": zone["name"],
                "district": zone["district"],
                "riskScore": round(probability * 100),
                "probability": round(probability, 4),
                "severity": severity_for(probability),
                "confidence": confidence_for(probability),
                "timestamp": timestamp,
                "factors": _factor_list(
                    zone, probability, live=uses_live_inputs(zone["id"])
                ),
            }
        )
    return records


def forecasts() -> list[dict]:
    """24h/48h/72h demo forecasts (same shape as the frontend Forecast type)."""
    records: list[dict] = []
    for period, _scenario in FORECAST_SCENARIOS.items():
        probabilities = [
            probability_for(zone["id"], scenario=period)
            for zone in MONITORING_ZONES
        ]
        mean_p = sum(probabilities) / len(probabilities)
        records.append(
            {
                "period": period,
                "riskScore": round(mean_p * 100),
                "probability": round(mean_p, 4),
                "severity": severity_for(mean_p),
                "rainfall": None,
                "factors": [
                    f"LHASA forecast probability {mean_p:.0%}",
                    "Sample-input demo (monsoon rainfall trend) — no live NASA data",
                    "Driven by GEOS-style forecast in production",
                ],
                "productDate": datetime.now(timezone.utc).isoformat(),
            }
        )
    return records
