"""FastAPI server that exposes NASA LHASA to the React frontend.

The model itself (lhasa.py + model.json) is Python and cannot run in a
browser. This server is the bridge: the frontend's mlService calls these
endpoints, each run executes the real LHASA pipeline in the background and
the probability raster that LHASA writes is converted into the zone-level
records the React pages render.

Run from the repository root with the `lhasa` conda env active:

    conda activate lhasa
    pip install -r backend/requirements.txt
    python -m uvicorn backend.app.main:app --reload --port 8000
"""
from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from . import config, output_reader, runner, scorer, zones
from .runner import RunStore
from .schemas import PredictRequest, RunCreate

app = FastAPI(
    title="LHASA API",
    version="0.1.0",
    description="NASA LHASA landslide nowcast/forecast behind an HTTP API "
    "consumed by the React frontend.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        o.strip()
        for o in os.environ.get("LHASA_CORS_ORIGINS", "*").split(",")
        if o.strip()
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

store = RunStore()


# --------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------
def _run_hazard_files(run: dict) -> tuple[list[Path], list[Path]]:
    """Resolve nrt/forecast file lists stored on a completed run."""
    output_dir = run.get("output_dir")
    if not output_dir:
        return [], []
    base = Path(output_dir)
    return (
        output_reader.hazard_files("nrt", base),
        output_reader.hazard_files("fcast", base),
    )


def _real_run_records() -> tuple[list[dict], list[dict]]:
    """(predictions, forecasts) from the most recent completed real run."""
    run = store.latest_completed()
    if run is None:
        return [], []
    nrt_files, fcast_files = _run_hazard_files(run)
    predictions = (
        output_reader.predictions_from_file(nrt_files[-1]) if nrt_files else []
    )
    forecasts = output_reader.forecasts_from_files(fcast_files)
    return predictions, forecasts


def _latest_predictions() -> list[dict]:
    """Zone-level predictions: real run output, or demo-scored real model."""
    real, _ = _real_run_records()
    if real:
        return real
    if scorer.model_ready() and config.DEMO_ENABLED:
        return scorer.predictions()
    raise HTTPException(
        status_code=404,
        detail="No completed LHASA run and no model to score. POST "
        "/api/v1/ml/runs to start one (requires LHASA static data and "
        "NASA data access).",
    )


def _latest_forecasts() -> list[dict]:
    """Forecast records: real run output, or demo-scored real model."""
    _, real_forecasts = _real_run_records()
    if real_forecasts:
        return real_forecasts
    if scorer.model_ready() and config.DEMO_ENABLED:
        return scorer.forecasts()
    raise HTTPException(
        status_code=404,
        detail="No completed LHASA run and no model to score. POST "
        "/api/v1/ml/runs to start one (requires LHASA static data and "
        "NASA data access).",
    )


def _recommendations_from(records: list[dict]) -> list[dict]:
    recommendations: list[dict] = []
    for record in sorted(
        records, key=lambda r: r["riskScore"], reverse=True
    )[:5]:
        zone_name = record["zoneName"]
        probability = record["probability"]
        if record["severity"] == "severe":
            priority, action = "high", "Evacuation readiness"
            description = (
                f"LHASA estimates {probability:.0%} landslide probability in "
                f"{zone_name}. Prepare evacuation and alert disaster teams."
            )
        elif record["severity"] == "high":
            priority, action = "medium", "Increased monitoring"
            description = (
                f"Elevated landslide probability ({probability:.0%}) in "
                f"{zone_name}. Step up sensor and patrol monitoring."
            )
        else:
            continue
        recommendations.append(
            {
                "id": f"lhasa-rec-{record['zoneId']}",
                "priority": priority,
                "title": f"{action}: {zone_name}",
                "description": description,
                "targetZones": [zone_name],
                "createdAt": record["timestamp"],
            }
        )
    return recommendations


# --------------------------------------------------------------------------
# health / readiness
# --------------------------------------------------------------------------
@app.get("/api/v1/health")
def health() -> dict:
    model_ok = config.MODEL_FILE.exists()
    missing = runner.static_missing(forecast=True)
    static_present = [
        name
        for name in config.REQUIRED_STATIC_FILES + config.FORECAST_STATIC_FILES
        if name not in missing
    ]
    return {
        "status": "ok",
        "lhasa": {
            "version": "2.1.1",
            "dir": str(config.LHASA_DIR),
            "model": {"present": model_ok},
            "static": {
                "present": not missing,
                "presentFiles": static_present,
                "missing": missing,
            },
            "ready": model_ok and not missing,
            "demo": {
                "enabled": config.DEMO_ENABLED and model_ok,
                "note": "scores the real trained model with sample inputs "
                "until a real NASA data run completes",
            },
        },
        "interpreter": config.PYTHON_BIN,
        "zones": len(zones.MONITORING_ZONES),
    }


# --------------------------------------------------------------------------
# run management
# --------------------------------------------------------------------------
@app.post("/api/v1/ml/runs", status_code=201)
def start_run(payload: RunCreate) -> dict:
    run = store.create(
        date=payload.date, lead=payload.lead, bbox=payload.bbox.model_dump()
    )
    return {
        "id": run["id"],
        "status": run["status"],
        "created_at": run["created_at"],
        "lead": run["lead"],
        "date": run["date"],
        "message": "LHASA run started. Poll GET /api/v1/ml/runs/{id}.",
    }


@app.get("/api/v1/ml/runs")
def list_runs() -> list[dict]:
    return store.list()


@app.get("/api/v1/ml/runs/{run_id}")
def run_detail(run_id: str) -> dict:
    run = store.get(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found.")
    return run


# --------------------------------------------------------------------------
# predictions / forecasts / recommendations (frontend-facing)
# --------------------------------------------------------------------------
@app.get("/api/v1/ml/predictions")
def predictions() -> list[dict]:
    return _latest_predictions()


@app.get("/api/v1/ml/forecasts")
def forecasts() -> list[dict]:
    return _latest_forecasts()


@app.get("/api/v1/ml/recommendations")
def recommendations() -> list[dict]:
    return _recommendations_from(_latest_predictions())


@app.post("/api/v1/ml/predict")
def predict(payload: PredictRequest) -> dict:
    """Kick off a run and return a best-effort prediction for one zone.

    LHASA takes minutes to download data and run, so this returns the
    prediction from the most recent completed run when one exists and the
    freshly queued run otherwise.
    """
    # No real run yet: in demo mode answer immediately from the scored model
    # instead of queueing a run that would fail without NASA data access.
    if store.latest_completed() is None and config.DEMO_ENABLED:
        records = scorer.predictions()
        if payload.zoneId is not None:
            records = [r for r in records if r["zoneId"] == payload.zoneId]
        return {
            "run_id": None,
            "status": "demo",
            "prediction": records[0] if records else None,
            "message": "Demo mode: real LHASA model scored with sample inputs. "
            "Configure NASA Earthdata access for live runs.",
        }

    run = store.create(
        date=payload.date, lead=payload.lead, bbox=dict(config.DEFAULT_BBOX)
    )
    previous = store.latest_completed()
    if previous is None:
        return {
            "run_id": run["id"],
            "status": run["status"],
            "prediction": None,
            "message": "LHASA run started; no completed prediction yet.",
        }
    records = _latest_predictions()
    if payload.zoneId is not None:
        records = [r for r in records if r["zoneId"] == payload.zoneId]
    return {
        "run_id": run["id"],
        "status": run["status"],
        "prediction": records[0] if records else None,
        "message": "LHASA run started; prediction is from the previous run.",
    }
