# Adding Real Data to the LHASA Model — Integration Guide

> **What this document is about.** The LHASA XGBoost model in this project
> always needs 6 numbers per location to produce a landslide probability.
> Right now, out of the box, the "live" numbers are **sample values** so the
> whole stack runs without a NASA account (demo mode). This guide explains —
> in detail — every way to replace those samples with **real data**, from
> fully-automatic NASA satellite ingestion to feeding your own sensor network.

---

## 1. Model inputs and outputs — the full picture

### 1.1 The 6 input features

The trained model `LHASA/model.json` is an XGBoost regressor trained by NASA
on historical landslides. It consumes **one feature vector per grid cell**
(~1 km / 30 arc-second):

| # | Feature name | Physical meaning | Units / range | Kind | Real-world sources |
|---|---|---|---|---|---|
| 1 | `Lithology` | Geological formation class at the cell | integer code | **static** | `LHASA/static/Lithology.nc4` (from NASA `static.zip`) |
| 2 | `Slope` | Terrain slope angle | degrees | **static** | `LHASA/static/Slope.nc4` |
| 3 | `pga` | Seismic preconditioning (peak ground acceleration context) | 0–1 (typical) | **static** | `LHASA/static/pga.nc4` |
| 4 | `gwetprof` | Total profile soil wetness | 0–1 | **live** | NASA SMAP L4 — *or your soil-moisture sensors / raster* |
| 5 | `antecedent` | Rainfall accumulated over the previous ~2 days | mm | **live** | NASA IMERG — *or your rain gauges / raster* |
| 6 | `rain` | Current day's rainfall (normalized, see 1.2) | mm→ratio | **live** | NASA IMERG / GEOS-FP — *or your rain gauges / raster* |

**Static** inputs rarely change — they describe the terrain itself and come
from the downloadable NASA static data files. **Live** inputs change every
day and are the data you must supply or fetch.

### 1.2 How the features are computed inside LHASA

- `rain` — the model does **not** receive raw mm directly. The day's
  precipitation is divided by the region's 99th-percentile daily rainfall
  (`static/p99.nc4` for nowcasts, `static/p99geos.nc4` for forecasts), which
  normalizes "how extreme is today" onto a comparable scale.
- `antecedent` — a raw 2-day accumulated rainfall total (mm).
- `gwetprof` — soil profile wetness as a 0–1 fraction.
- `Lithology`, `Slope`, `pga` — read from the static rasters at the same grid
  cell and regridded to match the rainfall grid.

### 1.3 What the model outputs

One number per grid cell: **`p_landslide`**, the probability (0–1) that a
rainfall-triggered landslide occurs at that cell that day. Everything shown in
the frontend is derived from that single value:

| Frontend field | Derivation |
|---|---|
| `probability` | `p_landslide` sampled at the zone's coordinates |
| `riskScore` | `probability × 100` |
| `severity` | `< 0.1` low · `0.1–0.5` moderate · `0.5–0.9` high · `≥ 0.9` severe |
| `confidence` | heuristic: `0.5 + |probability − 0.5|` capped at 0.98 |
| forecast records | mean `p_landslide` over the monitored zones for each lead day |

### 1.4 Where the sample (demo) data lives today

`backend/app/scorer.py` contains `ZONE_PARAMS` — one row per monitored Nepal
zone with sample `lithology`, `slope`, `pga`, `wetness`, `rain` values. The
API scores the real model with those vectors and every returned record carries
the factor *"Sample inputs — demo mode (no live NASA data)"*.

---

## 2. Prerequisites that apply to *every* real-data route

No matter which option you choose, the following must exist before `lhasa.py`
itself can run (Options A and B). Option C (sensor values) only needs the
trained model file and is explained in §5.

1. **Trained model** — already present: `LHASA/model.json` (1.1 MB).
2. **Geospatial Python environment** — the package set in `LHASA/lhasa.yml`
   (Python 3.12, xgboost, rioxarray, xarray, pandas, netcdf4, dask, …):

   ```bash
   conda env create -f LHASA/lhasa.yml
   conda activate lhasa
   pip install -r backend/requirements.txt
   ```

   > ⚠️ The API's lightweight `backend/.venv` (used for demo mode) only
   > contains fastapi/uvicorn/xgboost/numpy. Running `lhasa.py` itself needs
   > the full geospatial stack above.
3. **Static rasters** — several GB, downloaded once from NASA and unzipped so
   the files appear in `LHASA/static/`:

   ```bash
   wget https://gpm.nasa.gov/sites/default/files/data/landslides/static.zip
   unzip static.zip -d LHASA/
   ```

   Required files: `Lithology.nc4`, `Slope.nc4`, `pga.nc4`, `mask.nc4`,
   `p99.nc4` (nowcast) and additionally `p99geos.nc4` (forecast days).
   `GET /api/v1/health` lists exactly which are present/missing.
4. **A "when" and "where"** — each run models a specific UTC product time
   (`-d "YYYY-MM-DD HH:MM"`) over a bounding box (`-N/-S/-E/-W`). This
   project defaults to Nepal: N 31 / S 26 / E 89 / W 80.

---

## 3. Option A — Automatic NASA live data (IMERG + SMAP + GEOS)

The pipeline downloads today's real satellite rainfall (IMERG), soil moisture
(SMAP) and, for forecast days, NASA's GEOS-FP model precipitation, then writes
hazard netCDFs. Nothing else needs to be supplied per run.

### 3.1 Steps

**Step 1 — Environment & static data (§2).**

**Step 2 — Earthdata credentials.** IMERG and SMAP are NASA Earthdata
products; downloads authenticate against `~/.netrc`:

```bash
touch ~/.urs_cookies ~/.netrc ~/.dodsrc
# Earthdata login (create free account at https://urs.earthdata.nasa.gov/)
echo "machine urs.earthdata.nasa.gov login <USERNAME> password <PASSWORD>" >> ~/.netrc
# PPS login (only needed for IMERG HDF5; GIS rasters also go through PPS)
echo "machine jsimpsonhttps.pps.eosdis.nasa.gov login <USERNAME> password <PASSWORD>" >> ~/.netrc
echo "HTTP.NETRC=~/.netrc"          >> ~/.dodsrc
echo "HTTP.COOKIEJAR=~/.urs_cookies" >> ~/.dodsrc
```

**Step 3 — Start a run through the API.** The backend launches `lhasa.py` in
the background (Nepal bbox, nowcast + 3 forecast days):

```bash
curl -X POST http://127.0.0.1:8000/api/v1/ml/runs \
     -H "Content-Type: application/json" \
     -d '{"date": "2026-09-08 06:00", "lead": 3}'

curl http://127.0.0.1:8000/api/v1/ml/runs        # list runs
curl http://127.0.0.1:8000/api/v1/ml/runs/<ID>   # status + live log
```

If `date` is omitted the pipeline looks up the latest IMERG product itself.

**Step 4 — Read the results.** Once the run shows `status: "completed"` the
API automatically serves the real output:

```bash
curl http://127.0.0.1:8000/api/v1/ml/predictions
curl http://127.0.0.1:8000/api/v1/ml/forecasts
curl http://127.0.0.1:8000/api/v1/ml/recommendations
```

### 3.2 Where the real output lands

Each API run writes to its own directory (no overwrites between runs):

```
backend/.lhasa_runs/<run_id>/
├── nrt/hazard/20260907T0600.nc4     ← nowcast day (sampled for /predictions)
└── fcast/hazard/…+20260908T0600.nc4 ← forecast days (sampled for /forecasts)
```

Each netCDF holds the `p_landslide` variable over `lat/lon` for that date.
`backend/app/output_reader.py` samples these files at the monitoring-zone
coordinates.

### 3.3 What can go wrong

| Symptom | Likely cause | Fix |
|---|---|---|
| Run fails immediately with "static data missing" | `static.zip` not unzipped into `LHASA/` | Download + unzip (§2) |
| Run fails with HTTP/network errors in the log | NASA data servers unreachable | NASA blocks *this network* (see note below) or transient downtime (NASA: "frequent server downtime") — retry later |
| "exited with code …" during download | `.netrc`/`.dodsrc` not configured | Re-check §3.1 Step 2 |
| Only NRT runs, forecast never completes | GEOS-FP / `p99geos.nc4` unavailable | Check `p99geos.nc4` present; forecast requires GEOS OpenDAP access |

> ⚠️ **Network note.** NASA's published map server `maps.nccs.nasa.gov` is
> IPv6-only, and at least one test network had no IPv6 route — the published
> global LHASA maps were unreachable from it. The data-download hosts used by
> `lhasa.py` (PPS `jsimpsonhttps.pps.eosdis.nasa.gov`, GES DISC, GEOS OpenDAP)
> are IPv4-capable, so live runs can still work where the map server cannot.

---

## 4. Option B — Your own raster files (rainfall / soil moisture)

LHASA 2.1.1 supports **user-supplied files** for the three live inputs, which
is how you can drive the model with your own real rainfall and soil-moisture
rasters (e.g. produced from your rain-gauge network or a national weather
service grid) instead of NASA satellite downloads.

### 4.1 File requirements

| Flag | Input | File type | Contents |
|---|---|---|---|
| `-cf <file>` | current-day rainfall | GeoTIFF | today's precipitation, **mm** |
| `-af <file>` | antecedent rainfall | GeoTIFF | last ~2 days accumulated, **mm** |
| `-mf <file>` | soil moisture | GeoTIFF | total-profile wetness, **0–1** |

- Geographic CRS: **EPSG:4326** (WGS84 lon/lat). Files are clipped to the
  `-N/-S/-E/-W` box automatically; no-data pixels are respected.
- The rasters should cover at least the study box. Any coarser/finer grid is
  regridded by the pipeline.
- Rainfall values are used both raw (antecedent) and normalized by the local
  99th-percentile map (current-day rain), so **units must be millimetres**.

### 4.2 Example command (nowcast only, Nepal box)

```bash
conda activate lhasa

python LHASA/lhasa.py \
  -p  LHASA \
  -d  "2026-09-08 06:00" \
  -l  0 \
  -f  nc4 \
  -o \
  -N  31 -S 26 -E 89 -W 80 \
  -cf ./data/rain_today.tif \
  -af ./data/rain_last2days.tif \
  -mf ./data/soil_moisture.tif
```

Add `-l 3` and an `-mf`-style moisture raster plus GEOS availability if you
also want the 24/48/72h forecasts (forecast rain comes from NASA GEOS-FP,
not your file).

Output appears under `LHASA/nrt/hazard/` (when `-op` is omitted). To make the
API serve these files instead of demo data, point the server at that output
directory with `LHASA_OUTPUT_DIR=<folder>` and run with `LHASA_DEMO=0`.

### 4.3 Calibration caveat (read this)

NASA explicitly warns that LHASA was trained on IMERG liquid precipitation;
feeding it a different rainfall source **shifts absolute probabilities**. Treat
results as *relative risk* until you validate against local landslide events
(or recalibrate — not supported by the released model).

---

## 5. Option C — Feed your own sensor network into the model (no NASA)

If you operate ground sensors — the frontend already models rainfall gauges and
soil-moisture stations per district (`SensorsPage`, `frontend/src/data/mockData.ts`)
— you can drive the **real trained model** with those live readings. This is
the fastest path for a deployment that has its own instrumentation and no NASA
account.

### 5.1 Concept

`backend/app/scorer.py` loads the real `model.json` and builds each zone's
feature vector from `ZONE_PARAMS`. Swap the sample `wetness`/`rain` values for
real sensor readings and the model is scored on your data:

| Sensor type (frontend) | Model feature |
|---|---|
| `rainfall` gauge in the district | `rain` (and derive `antecedent` from previous days) |
| `soil_moisture` probe | `gwetprof` |
| (static terrain) | keep `lithology` / `slope` / `pga` from `ZONE_PARAMS` or real rasters |

### 5.2 Zone ↔ sensor mapping

Each monitored zone has a district; the frontend mock data already pairs them:

| Zone | District | Rainfall sensor | Soil-moisture sensor |
|---|---|---|---|
| rz-001 Sindhupalchok North | Sindhupalchok | — | SNS-001 |
| rz-002 Dolakha Ridge | Dolakha | SNS-002 | — |
| rz-003 Makwanpur Valley | Makwanpur | — | SNS-004 |
| rz-004 Gorkha Hills | Gorkha | SNS-005 (temp) | — |
| rz-005 Nuwakot Lowlands | Nuwakot | — | — |
| rz-006 Rasuwa Corridor | Rasuwa | — | SNS-003 (tilt) |
| rz-007 Dhading Terraces | Dhading | SNS-006 | — |
| rz-008 Sindhuli Slopes | Sindhuli | — | — |
| rz-009 Kavre Highlands | Kavrepalanchok | — | SNS-008 |
| rz-010 Ramechhap Basin | Ramechhap | — | SNS-010 |

### 5.3 How to wire it

Minimal version — edit `ZONE_PARAMS` in `backend/app/scorer.py`, e.g.:

```python
"rz-001": {"lithology": 7, "slope": 33, "pga": 0.01,
           "wetness": 0.62,    # ← SNS-001 live soil moisture (% / 100)
           "rain": 38},        # ← district rain gauge, mm today
```

Restart the server; `GET /api/v1/ml/predictions` now reflects real readings
(keep `LHASA_DEMO=1` — the model is real; only the "live" columns are yours).

Production version — don't hardcode. Recommended API shape (not yet
implemented):

```
POST /api/v1/data/readings   {"zoneId": "rz-001", "rain_mm": 38, "wetness": 0.62}
GET  /api/v1/ml/predictions   # scorer reads latest readings per zone
```

`antecedent` can be computed server-side as the rolling 2-day sum of stored
`rain_mm` readings, giving a genuinely time-aware nowcast.

### 5.4 Practical notes

- Sensor `%` moisture needs converting to a 0–1 wetness fraction; sensor
  values should be spatially averaged per zone, not point samples.
- Calibrate: compare model probabilities against actual slides/reports in
  your area before issuing public alerts.
- The static columns (`lithology`, `slope`, `pga`) can also become real by
  sampling your own DEM/geology rasters instead of the table defaults.

---

## 6. Demo vs. real — how the API decides

`backend/app/main.py` resolves `/api/v1/ml/predictions` like this:

1. If a **completed real run** exists → read its netCDF rasters and sample the
   zones (always wins over demo).
2. Otherwise, if demo is enabled (`LHASA_DEMO` unset or `1`) and
   `LHASA/model.json` exists → score the real model with current sample/sensor
   inputs (`backend/app/scorer.py`).
3. Otherwise → HTTP 404 asking for a real run.

To force only real results: set `LHASA_DEMO=0` before starting the server.
`GET /api/v1/health` reports demo status, model presence and which static
files are missing.

---

## 7. Reference — relevant files

| File | Role |
|---|---|
| `LHASA/model.json` | The trained XGBoost weights (the "model") |
| `LHASA/lhasa.py` | NASA pipeline: download → regrid → score → write rasters |
| `LHASA/static/` | Static terrain rasters (`Lithology`, `Slope`, `pga`, `p99`, `mask`, …) |
| `backend/app/runner.py` | Runs `lhasa.py` per API run, manages output dirs |
| `backend/app/output_reader.py` | Reads netCDF hazard files, samples zones |
| `backend/app/scorer.py` | Demo/sensor scoring path + `ZONE_PARAMS` samples |
| `backend/app/zones.py` | The 10 monitored Nepal zones (ids, names, coordinates) |
| `backend/app/main.py` | Endpoints + real-vs-demo resolution |
| `backend/.lhasa_runs/<id>/` | Output netCDFs of each real API run |

## 8. Which option should you choose?

| Situation | Recommended route |
|---|---|
| Have a NASA Earthdata account, want global automatic nowcasts | **A** (§3) |
| Have your own rainfall/soil rasters, no NASA downloads | **B** (§4) |
| Run your own rain/moisture sensor network | **C** (§5) |
| Just exploring — no external data yet | keep demo mode (§1.4) |
