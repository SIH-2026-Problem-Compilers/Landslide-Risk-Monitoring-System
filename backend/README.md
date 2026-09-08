# LHASA API server

NASA's LHASA is a Python/XGBoost geospatial pipeline — it cannot run inside a
browser. This FastAPI server is the bridge between that model (in `LHASA/`)
and the React frontend (in `frontend/`):

- `POST /api/v1/ml/runs` starts a real LHASA run in the background (downloads
  IMERG/GEOS/SMAP inputs, runs `lhasa.py`, writes hazard netCDFs to
  `backend/.lhasa_runs/<id>/`).
- `GET /api/v1/ml/predictions` samples the latest completed run's probability
  raster at the 10 monitoring zones the frontend already knows and returns
  records shaped exactly like the frontend `Prediction` type.
- `GET /api/v1/ml/forecasts` does the same for the 24h/48h/72h forecast days.
- The frontend `mlService` calls these endpoints and falls back to its mock
  data while the server is down or before the first run completes.

## Prerequisites

1. **Conda environment.** LHASA ships its own environment in `LHASA/lhasa.yml`:

   ```bash
   conda env create -f LHASA/lhasa.yml
   conda activate lhasa
   pip install -r backend/requirements.txt   # adds fastapi + uvicorn
   ```

2. **Model + static data.** The trained model `LHASA/model.json` is included.
   The global static rasters are not (several GB). Download `static.zip` from
   <https://gpm.nasa.gov/sites/default/files/data/landslides/static.zip> and
   unzip it so the files land in `LHASA/static/`. `GET /api/v1/health` reports
   exactly which files are still missing.

3. **NASA data access.** LHASA downloads IMERG precipitation from the NASA PPS
   and (for forecasts) GEOS from the NCCS portal. Follow the Earthdata / PPS
   `.netrc` setup in `LHASA/README.md`. Without it the run will fail with a
   descriptive error in the run log.

## Running the server

```bash
python backend/run.py          # http://127.0.0.1:8000 (docs at /docs)
```

Environment variables (all optional):

| Variable            | Default                          | Purpose                              |
| ------------------- | -------------------------------- | ------------------------------------ |
| `LHASA_DIR`         | `<repo>/LHASA`                   | Location of `lhasa.py`/`model.json`  |
| `LHASA_OUTPUT_DIR`  | `<LHASA_DIR>`                    | Manual-run outputs (API runs use own dir) |
| `LHASA_PYTHON`      | `python`                         | Interpreter for `lhasa.py` (the `lhasa` env) |
| `LHASA_CORS_ORIGINS`| `*`                              | Comma-separated allowed CORS origins |

## API quickstart

```bash
# 1. Health / readiness — tells you what LHASA data is present
curl http://127.0.0.1:8000/api/v1/health

# 2. Start a nowcast + 3 forecast days over Nepal (default study area)
curl -X POST http://127.0.0.1:8000/api/v1/ml/runs \
     -H "Content-Type: application/json" \
     -d '{"lead": 3}'

# 3. Poll the run (status: queued -> running -> completed/failed)
curl http://127.0.0.1:8000/api/v1/ml/runs/<run_id>

# 4. When completed, fetch what the frontend consumes
curl http://127.0.0.1:8000/api/v1/ml/predictions
curl http://127.0.0.1:8000/api/v1/ml/forecasts
curl http://127.0.0.1:8000/api/v1/ml/recommendations
```

Notes on output conversion: only `p_landslide` (rainfall-triggered
probability) is a genuine LHASA product. `riskScore` = probability × 100,
`severity` uses LHASA's 0.1/0.5/0.9 thresholds, `confidence` is a
distance-from-0.5 heuristic, and forecast `rainfall` is `null` because the
hazard product does not store precipitation amounts.

For the full picture of how to feed **real data** into the model — NASA
live satellite runs, user-supplied rainfall/moisture rasters, or your own
sensor network — see [`doc/REAL_DATA_GUIDE.md`](../doc/REAL_DATA_GUIDE.md).
