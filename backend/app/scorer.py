"""Score the real LHASA model with sample inputs when live data isn't reachable.

NASA's LHASA normally runs as a Python pipeline fed by satellite data that
requires an Earthdata account and (for the published map server) IPv6. Until
that is available, this module exercises the *actual* trained XGBoost model
(LHASA/model.json) with clearly-labelled sample inputs for the Nepal
monitoring zones, so the frontend shows genuine model output instead of mock
data.

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

# Sample inputs per NER monitoring zone, calibrated so the real XGBoost
# model responds across the severity scale. rain = current-day rainfall (mm),
# wetness = soil profile wetness 0-1, antecedent = rain * 2 (2-day mm).
# These are fallback values — when real zone inputs exist (sensor readings /
# IMD feed, see app/inputs.py) they take precedence.
ZONE_PARAMS: dict[str, dict] = {
    "rz-001": {"lithology": 6, "slope": 30, "pga": 0.01, "wetness": 0.02, "rain": 3},   # p~0.41 moderate
    "rz-002": {"lithology": 5, "slope": 28, "pga": 0.01, "wetness": 0.02, "rain": 3},   # p~0.39 moderate
    "rz-003": {"lithology": 5, "slope": 25, "pga": 0.01, "wetness": 0.28, "rain": 6},   # p~0.54 high
    "rz-004": {"lithology": 6, "slope": 28, "pga": 0.01, "wetness": 0.28, "rain": 3},   # p~0.44 moderate
    "rz-005": {"lithology": 6, "slope": 31, "pga": 0.01, "wetness": 0.28, "rain": 42},  # p~0.75 high
    "rz-006": {"lithology": 5, "slope": 27, "pga": 0.01, "wetness": 0.12, "rain": 3},   # p~0.40 moderate
    "rz-007": {"lithology": 7, "slope": 33, "pga": 0.01, "wetness": 0.36, "rain": 42},  # p~0.94 severe
    "rz-008": {"lithology": 6, "slope": 31, "pga": 0.01, "wetness": 0.12, "rain": 30},  # p~0.62 high
    "rz-009": {"lithology": 6, "slope": 32, "pga": 0.01, "wetness": 0.24, "rain": 30},  # p~0.68 high
    "rz-010": {"lithology": 6, "slope": 30, "pga": 0.01, "wetness": 0.28, "rain": 3},   # p~0.46 moderate
    "rz-011": {"lithology": 7, "slope": 34, "pga": 0.01, "wetness": 0.36, "rain": 6},   # p~0.89 severe
    "rz-012": {"lithology": 6, "slope": 30, "pga": 0.01, "wetness": 0.22, "rain": 3},   # p~0.44 moderate
    "rz-013": {"lithology": 5, "slope": 24, "pga": 0.01, "wetness": 0.02, "rain": 3},   # p~0.36 moderate
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
