# AI-Based Early Warning and Landslide Risk Monitoring System

An early-warning dashboard for rainfall-triggered landslides across **India's
hazard belt** (27 zones: North East India, the Himalaya — J&K / Himachal /
Uttarakhand — Darjeeling, and the Western Ghats). It pairs a React +
TypeScript monitoring console (risk zones, GIS map, sensors, alerts,
predictions, reports, emergency response) with NASA's **LHASA** model
(*Landslide Hazard Assessment for Situational Awareness*), which estimates the
daily probability of landslide occurrence on a ~1 km global grid.

Live data is on by default — Open-Meteo weather drives every risk score, the
forecast cards show real rainfall, the GIS map carries live USGS earthquakes
and satellite imagery, with zero signup. Every additional Indian data source
(IMD, MOSDAC, NASA Earthdata, SMS gateways, IoT sensor stations) is catalogued
in [`doc/INDIA_LIVE_DATA_APIS.md`](doc/INDIA_LIVE_DATA_APIS.md), and optional
ESP32 sensor-station support is documented in [`doc/IOT_INTEGRATION.md`](doc/IOT_INTEGRATION.md).

| Layer     | Tech stack                                                    | Location    |
| --------- | ------------------------------------------------------------- | ----------- |
| Frontend  | React 19, TypeScript, Vite, Tailwind, Leaflet, Recharts       | `frontend/` |
| API       | FastAPI + Uvicorn                                             | `backend/`  |
| Model     | NASA LHASA 2.1.1 (Python, XGBoost, xarray/rasterio)           | `LHASA/`    |

The LHASA directory in this repo is the runnable core of the official NASA
repository (see its own `LHASA/README.md` for the model documentation). The
Post-fire debris-flow sub-model and Git history were removed on purpose.

## Architecture

```
Browser (React)
   │  fetch /api/v1/ml/predictions|forecasts|recommendations
   ▼                        (Vite dev proxy: /api -> http://127.0.0.1:8000)
FastAPI server  (backend/app/main.py)
   │
   ├── Live mode:  POST /api/v1/ml/runs -> runs LHASA/lhasa.py in the
   │               background (NASA IMERG/SMAP/GEOS data + static rasters),
   │               then samples the produced p_landslide raster at each
   │               monitored zone.
   │
   └── Demo mode:  scores LHASA/model.json directly with sample inputs
                   (backend/app/scorer.py) when no live run has completed.
```

NASA's LHASA is a Python/geospatial pipeline — it cannot run in a browser.
The FastAPI server is the bridge: it exposes LHASA as simple HTTP endpoints
that return exactly the data shapes the React pages render.

The frontend's `mlService` (`frontend/src/services/mlService.ts`) calls the API
and falls back to bundled mock data while the API is offline, so the UI always
works during development.

## Quick start (demo mode — no NASA account needed)

Demo mode scores the **real trained model** (`LHASA/model.json`) with
clearly-labelled sample rainfall/soil-moisture inputs, so you can run and
explore the whole stack immediately. Start from the repository root:

```bash
# 1. Backend API
py -m venv backend/.venv                                   # or: python -m venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt   # Windows
# backend/.venv/bin/python -m pip install -r backend/requirements.txt         # macOS/Linux

cd backend
../.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000   # or: python run.py
```

```bash
# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev          # http://127.0.0.1:5173  ->  open /predictions
```

Open **http://127.0.0.1:5173/predictions** — the risk table, 24/48/72h forecast
cards and AI recommendations are produced live by the LHASA model. A "Sample
inputs" factor on every record marks demo mode.

## Live sensor + laptop GPS demo

The **Sensors** page lists only stations that actually reported data — there is
no static "27 sensors" list and no synthetic sensor fallback. Two real paths
feed it:

- **Wi-Fi** — the ESP32 sketch in `hardware/esp32/lhasa_station/` pushes its
  readings (soil moisture, temperature, humidity) to the API.
- **USB** — click *Connect sensor* on the Sensors page in Chrome/Edge; the
  browser reads the board's JSON lines over Web Serial and forwards them.

The page asks the browser for the **laptop GPS** position (Windows/macOS
location services). A station with no GPS module adopts that position as its
map marker (`location_source = laptop_gps`), while its readings still feed the
monitoring zone configured in the firmware. Enable the **Sensors** layer on the
GIS page to see it, then use *Center on my sensor*. If location permission is
denied, coordinates can be entered manually in the same panel.

Station metadata and positions live in the `sensor_stations` table, created
automatically on startup.

## Live mode (real NASA satellite data)

Demo output is enabled by default (`LHASA_DEMO=1`). For genuine nowcasts
fed by live IMERG rainfall and SMAP soil moisture you need a **NASA Earthdata
account** and the static GIS rasters, then simply start a run — the API
automatically switches to the real output once a run completes:

```bash
# 1. Environment + data (one-time)
conda env create -f LHASA/lhasa.yml
conda activate lhasa
pip install -r backend/requirements.txt

# 2. Static rasters (several GB) -> files must land in LHASA/static/
#    wget https://gpm.nasa.gov/sites/default/files/data/landslides/static.zip

# 3. NASA data access credentials (Earthdata / PPS) in ~/.netrc and ~/.dodsrc
#    -> follow "Installation" in LHASA/README.md

# 4. Start a nowcast + 3 forecast days over India
curl -X POST http://127.0.0.1:8000/api/v1/ml/runs -H "Content-Type: application/json" -d '{"lead": 3}'
#    poll:  curl http://127.0.0.1:8000/api/v1/ml/runs/<run_id>
```

Stop demo mode if you only want real results: set `LHASA_DEMO=0` before
starting the server. Full details in `backend/README.md`.

**Feeding real data into the model** (NASA live data, your own rainfall
rasters, or your sensor network) is documented step by step in
[`doc/REAL_DATA_GUIDE.md`](doc/REAL_DATA_GUIDE.md).

## API reference (all served by the backend)

| Method | Endpoint                        | Description                                        |
| ------ | ------------------------------- | -------------------------------------------------- |
| GET    | `/api/v1/health`                | Model + static-data readiness and demo status      |
| POST   | `/api/v1/ml/runs`               | Start a LHASA run `{date?, lead?, bbox?}`          |
| GET    | `/api/v1/ml/runs`               | List runs                                          |
| GET    | `/api/v1/ml/runs/{run_id}`      | Run status + log                                   |
| GET    | `/api/v1/ml/predictions`        | Zone predictions (nowcast)                         |
| GET    | `/api/v1/ml/forecasts`          | 24h/48h/72h forecast (live rainfall mm)            |
| GET    | `/api/v1/ml/recommendations`    | Derived high/medium priority alerts                |
| POST   | `/api/v1/ml/predict`            | One-zone prediction + triggers a run               |
| GET    | `/api/v1/zones`                 | 27 India zones + live model scores                 |
| GET    | `/api/v1/seismic/live`          | Live USGS earthquakes in the India study area      |
| POST   | `/api/v1/weather/refresh`       | Pull Open-Meteo current + 3-day forecast           |
| POST   | `/api/v1/sensors/readings`      | IoT / field sensor push (feeds the model)          |
| POST   | `/api/v1/sensors/ingest`        | One station's reading batch, zone resolved from GPS |
| POST   | `/api/v1/sensors/heartbeat`     | Laptop GPS / station liveness ping                  |
| GET    | `/api/v1/sensors`               | Real registered stations only (no static list)      |
| POST   | `/api/v1/ml/evaluate`           | Raise alerts + fan out via SMS/webhook adapters    |

Interactive API docs: **http://127.0.0.1:8000/docs**.

## Configuration

| Variable             | Default                    | Purpose                                   |
| -------------------- | -------------------------- | ----------------------------------------- |
| `VITE_LHASA_API_URL` | *(none — dev proxy)*       | Backend origin for a deployed frontend    |
| `VITE_SENSOR_TOKEN`  | *(none)*                   | Sent as `X-Sensor-Token` by the browser sensor bridge when ingest auth is enabled |
| `LHASA_DIR`          | `<repo>/LHASA`             | Where `lhasa.py`/`model.json` live        |
| `LHASA_OUTPUT_DIR`   | `<LHASA_DIR>`              | Manual-run output directory               |
| `LHASA_PYTHON`       | `python`                   | Interpreter used to launch `lhasa.py`     |
| `LHASA_DEMO`         | `1`                        | Set `0` to require real NASA runs         |
| `LHASA_CORS_ORIGINS` | `*`                        | Allowed CORS origins                      |

## Project layout

```
├── frontend/          React monitoring dashboard (pages, services, mock data)
│   └── src/services/mlService.ts   <-> LHASA API (mock fallback)
├── backend/           FastAPI server + LHASA job runner + demo scorer
│   └── app/           main.py, runner.py, output_reader.py, scorer.py, zones.py
├── LHASA/             NASA LHASA model core: lhasa.py, model.json, lhasa.yml
├── doc/               High-level design (doc/HLD.drawio)
└── DESIGN.md          Visual design system for the frontend
```

## License & attribution

LHASA is NASA software released under the NASA Open Source Agreement v1.3
(see `LHASA/LICENSE.pdf`). When publishing results built on LHASA, cite:

Stanley T. A. et al. 2025. "Better Satellite Precipitation Algorithms Slightly
Improved Landslide Hazard Assessment." *J. Appl. Meteor. Climatol.*
DOI: [10.1175/JAMC-D-25-0021.1](https://doi.org/10.1175/JAMC-D-25-0021.1)
