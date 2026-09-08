"""Read LHASA hazard outputs and convert them to the shapes the React frontend expects.

lhasa.py writes one netCDF (variable ``p_landslide``, dims ``time/lat/lon``)
per modelled day under ``nrt/hazard/`` (nowcast) and ``fcast/hazard/``
(forecast days). This module finds those files, samples the probability
raster at each monitoring zone and maps the result onto the frontend's
``Prediction`` / ``Forecast`` interfaces.

Only ``p_landslide`` (rainfall-triggered probability) is a real LHASA output.
``riskScore`` is that probability scaled to 0-100, ``severity`` uses the
thresholds LHASA itself uses (0.1 / 0.5 / 0.9) and ``confidence`` is a
derived heuristic based on how far the probability sits from the 0.5 decision
boundary. Rainfall amounts are not part of the hazard product, so forecast
``rainfall`` is null.
"""
from __future__ import annotations

import glob
import math
import re
from datetime import datetime, timezone
from pathlib import Path

from . import config
from .zones import MONITORING_ZONES

# Severity thresholds (match LHASA exposure defaults l/m/h = 0.1/0.5/0.9).
SEVERITY_STEPS = ((0.9, "severe"), (0.5, "high"), (0.1, "moderate"))


def severity_for(probability: float | None) -> str:
    """Map a p_landslide value to the frontend RiskLevel vocabulary."""
    if probability is None or probability != probability:  # NaN
        return "low"
    if probability <= 0:
        return "low"
    for threshold, level in SEVERITY_STEPS:
        if probability >= threshold:
            return level
    return "low"


def confidence_for(probability: float | None) -> float:
    """Distance-from-decision-boundary heuristic, kept in [0.5, 0.98]."""
    if probability is None or probability != probability:
        return 0.5
    return round(min(0.98, 0.5 + abs(probability - 0.5)), 3)


_DATETIME_IN_NAME = re.compile(r"(\d{8}T\d{4})")


def product_datetime(path: Path) -> datetime:
    """Extract the product date encoded in the file name.

    Nowcast files look like ``20260904T0000.nc4``; forecast files look like
    ``20260903T1200+20260904T0000.nc4`` (init time + product time). The last
    match is always the product time.
    """
    matches = _DATETIME_IN_NAME.findall(path.name)
    raw = matches[-1] if matches else ""
    try:
        return datetime.strptime(raw, "%Y%m%dT%H%M").replace(tzinfo=timezone.utc)
    except ValueError:
        return datetime.now(timezone.utc)


def hazard_files(mode: str, base_dir: Path | None = None) -> list[Path]:
    """netCDF hazard files for a mode, ordered by product date ascending.

    Args:
        mode: "nrt" or "fcast".
        base_dir: per-run output directory (defaults to the global output dir).
    """
    base = base_dir or config.LHASA_OUTPUT_DIR
    pattern = str(base / mode / "hazard" / "*.nc4")
    files = [Path(p) for p in glob.glob(pattern)]
    files.sort(key=product_datetime)
    return files


def _open_probability(path: Path):
    """Lazily import xarray and return the p_landslide dataarray."""
    import xarray as xr

    dataset = xr.open_dataset(path, engine="netcdf4")
    da = dataset["p_landslide"]
    if "time" in da.dims:
        da = da.isel(time=0)
    da.load()
    dataset.close()
    return da


def probability_at(da, latitude: float, longitude: float) -> float | None:
    """Sample the nearest grid cell, treating nodata/NaN as no prediction."""
    try:
        value = float(
            da.sel(lat=latitude, lon=longitude, method="nearest")
        )
    except Exception:
        return None
    if math.isnan(value):
        return None
    if value <= 0 or value > 1:  # -9999 nodata fill or corrupt cell
        return None
    return round(value, 4)


def _zone_factor(zone: dict, probability: float | None) -> list[str]:
    if probability is None:
        return [
            "No LHASA data at zone location",
            f"Zone: {zone['district']}",
        ]
    return [
        f"Rainfall-triggered probability {probability:.0%}",
        f"Zone: {zone['district']}",
        "NASA LHASA v2.1.1 (XGBoost)",
    ]


def predictions_from_file(path: Path) -> list[dict]:
    """Sample one hazard file at every monitoring zone -> Prediction records."""
    da = _open_probability(path)
    product_time = product_datetime(path)
    compact = product_time.strftime("%Y%m%dT%H%M")
    timestamp = product_time.isoformat()
    records: list[dict] = []
    for zone in MONITORING_ZONES:
        probability = probability_at(da, zone["latitude"], zone["longitude"])
        records.append(
            {
                "id": f"lhasa-{zone['id']}-{compact}",
                "zoneId": zone["id"],
                "zoneName": zone["name"],
                "district": zone["district"],
                "riskScore": round((probability or 0) * 100),
                "probability": probability if probability is not None else 0,
                "severity": severity_for(probability),
                "confidence": confidence_for(probability),
                "timestamp": timestamp,
                "factors": _zone_factor(zone, probability),
            }
        )
    return records


PERIOD_LABELS = ("24h", "48h", "72h")


def forecasts_from_files(files: list[Path]) -> list[dict]:
    """First three forecast days -> Forecast records."""
    records: list[dict] = []
    for index, path in enumerate(files[: len(PERIOD_LABELS)]):
        da = _open_probability(path)
        period = PERIOD_LABELS[index]
        # Mean probability over the monitored zones for the lead day.
        probabilities = [
            probability_at(da, zone["latitude"], zone["longitude"])
            for zone in MONITORING_ZONES
        ]
        valid = [p for p in probabilities if p is not None]
        mean_p = (sum(valid) / len(valid)) if valid else None
        records.append(
            {
                "period": period,
                "riskScore": round((mean_p or 0) * 100),
                "probability": mean_p if mean_p is not None else 0,
                "severity": severity_for(mean_p),
                "rainfall": None,  # not part of the LHASA hazard product
                "factors": [
                    f"LHASA forecast probability {mean_p:.0%}" if mean_p else
                    "No LHASA forecast data in study area",
                    "Driven by NASA GEOS-FP forecast rainfall",
                ],
                "productDate": product_datetime(path).isoformat(),
            }
        )
    return records
