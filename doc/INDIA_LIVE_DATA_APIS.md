# India Live Data APIs — everything this website needs, in one file

> **What this file is.** Every API/data source required to show **real live
> data** on this landslide early-warning site (India edition): where to get
> it, how to sign up, what it costs, which environment variable unlocks it,
> and exactly which file/endpoint in this repo consumes it.
>
> Status legend:
> ✅ **wired** — already integrated, works today with zero signup
> 🔌 **pre-wired** — code is in place, add credentials in `backend/.env` and it works
> 📄 **documented** — not yet integrated; instructions below say where it plugs in

---

## 0. Status matrix — what is live on the site right now

| # | Data shown on the website | Source (API) | Signup / key | Status | Consumed by |
|---|---------------------------|--------------|--------------|--------|-------------|
| 1 | **Live rainfall + soil wetness driving every risk score** (Dashboard, Predictions, Zones) | Open-Meteo | none | ✅ wired | `backend/app/providers/openmeteo.py` → `zone_inputs` table → `backend/app/scorer.py`; refresh: `POST /api/v1/weather/refresh` (auto at startup) |
| 2 | **24/48/72 h forecast rainfall (mm) on the forecast cards** | Open-Meteo Forecast | none | ✅ wired | `openmeteo.ingest_forecast_all_zones()` → `zone_forecasts` table → `GET /api/v1/ml/forecasts` |
| 3 | **Live earthquakes on the GIS map** (seismic context for slope risk) | USGS Earthquake Feed | none | ✅ wired | `backend/app/providers/seismic.py` → `GET /api/v1/seismic/live` → `GISPage` “Live Earthquakes” layer |
| 4 | **Risk heatmap over all India** | NASA LHASA model scored locally | none | ✅ wired | `backend/app/grid.py` → `GET /api/v1/ml/grid` → `HeatmapLayer` |
| 5 | **Satellite & street basemaps** | Esri World Imagery + OpenStreetMap | none (attribution) | ✅ wired | `GISPage.tsx` basemap switch |
| 6 | **Official district rainfall (IMD)** replaces Open-Meteo rain | IMD API Portal `api.imd.gov.in` | free account → API key | 🔌 pre-wired | set `IMD_RAINFALL_URL` + `IMD_API_KEY` → `backend/app/providers/imd.py` → `POST /api/v1/data/imd/pull` |
| 7 | **Real NASA nowcasts (IMERG + SMAP + GEOS)** instead of sample inputs | NASA Earthdata | free account + `.netrc` | 🔌 pre-wired | `backend/app/runner.py` runs `LHASA/lhasa.py`; `POST /api/v1/ml/runs` |
| 8 | **SMS / WhatsApp / webhook alerts** when the evaluate engine raises one | MSG91 / Twilio / custom webhook | paid (DLT rules in India) | 🔌 pre-wired | `backend/app/providers/notify.py` ← `POST /api/v1/ml/evaluate`; env `NOTIFY_CHANNEL` |
| 9 | **Email alerts** | Resend / AWS SES / SendGrid | free tiers | 🔌 pre-wired (via webhook) | point `NOTIFY_WEBHOOK_URL` at a relay, or add an adapter next to `notify.py` |
| 10 | **Official weather warnings** (IMD district-wise colour warnings) | IMD Warning API | API key | 📄 documented | would plug into `GET /api/v1/alerts` as a second source |
| 11 | **Satellite gridded rainfall / snow** (ISRO products) | MOSDAC | free registration | 📄 documented | Option B feed for LHASA (`-cf/-af` rasters), see `doc/REAL_DATA_GUIDE.md` §4 |
| 12 | **Flood forecasts for river valleys** | CWC Flood Forecast | registration | 📄 documented | new `providers/cwc.py` → dashboard/roads |
| 13 | **Landslide inventory / history validation** | GSI, NDMA, DesInventar Sendai | free downloads | 📄 documented | `GET /api/v1/historical` |
| 14 | **Geocoding (district search)** | OSM Nominatim | none (policy limits) | 📄 documented | `ReportSubmitPage` / filters |
| 15 | **Population-at-risk grids** | WorldPop / Census India | free | 📄 documented | `population` fields in `zones.py` |
| 16 | **Highway/road closure status** | NHAI Highway Nowcast (IMD), MapmyIndia | key/registration | 📄 documented | `GET /api/v1/roads` |

**Zero-signup live mode (works right now):** rows 1–5. Start the backend and
the site already shows live weather-driven risk, live forecast rain, live
quakes, satellite imagery and a model-derived heatmap.

---

## 1. How live data flows in this repo

```
                    (no key)                          (key)
  Open-Meteo ──┐                                  IMD api.imd.gov.in ──┐
  USGS quakes ─┤                                  NASA Earthdata ──────┤
  Esri/OSM ────┤ providers/*  →  SQLite (zone_inputs, zone_forecasts,  │
               │                sensor_readings, alerts, citizen_reports)
               ▼                            │
        FastAPI  ── scorer.py (real XGBoost) ──► GET /api/v1/*
               │                                │
               └── runner.py ── LHASA/lhasa.py ─┘   (real NASA runs)
                                                     │
        notify.py  ◄── POST /api/v1/ml/evaluate ─────┘  → SMS/WhatsApp/webhook
                                                     │
        React services (withFallback → mockData) ◄───┘
```

Key files: `backend/app/providers/` (one module per source), `backend/app/inputs.py`
(persists live values), `backend/app/routers/ingest.py` + `routers/live.py`
(HTTP surface), `frontend/src/services/*.ts` (every service tries the API
first and falls back to `mockData.ts`).

---

## 2. API catalogue — full details

### A. Weather & rainfall (drives the model)

#### A1. Open-Meteo — ✅ already wired (no key, no account)
* **Gives:** current-day `precipitation_sum` (mm), `soil_moisture_0_to_7cm`
  (m³/m³ → our 0–1 wetness), and a 3-day precipitation forecast — per zone
  coordinate, sub-daily resolution.
* **Portal / docs:** <https://open-meteo.com> · <https://open-meteo.com/en/docs>
* **Access:** none — just `GET https://api.open-meteo.com/v1/forecast?...`
* **Cost:** free for non-commercial use; paid tier for commercial (check the
  pricing page before commercial deployment).
* **Rate limits:** generous (~10k/day free, “no hard limits for reasonable use”).
* **Env:** `OPEN_METEO_URL` (base URL override, default `https://api.open-meteo.com`).
* **In this repo:** `backend/app/providers/openmeteo.py`
  (`ingest_all_zones()` for today, `ingest_forecast_all_zones()` for +1/+2/+3 days).
  Called at startup (`backend/app/main.py`) and by `POST /api/v1/weather/refresh`.
* **Shows up on:** every risk score (Predictions, Dashboard, Zones page),
  forecast cards (`rainfall` mm), sensor last-readings fallback.

#### A2. IMD (India Meteorological Department) API Portal — 🔌 pre-wired (free key)
* **Gives:** *official Indian* data: district-wise rainfall, district-wise
  colour warnings, 5-day district forecast, city forecasts, nowcast, cyclone
  and highway (NHAI) warnings. This is the authoritative source the problem
  statement asks for.
* **Portal / docs:** <https://api.imd.gov.in/> · reference:
  <https://api.imd.gov.in/public/api_reference.html>
* **Endpoints (examples):**
  * District-wise rainfall → see “Rainfall APIs” in the reference
  * District-wise warnings → “Warning APIs”
  * City forecast: `GET https://api.imd.gov.in/api/v1/cityforecast?id=<station>`
  * Current weather: `GET https://api.imd.gov.in/api/v1/current_wx?id=<station>`
  * NHAI highway warning: “NHAI API” section
* **Access:** create an account on `api.imd.gov.in` → API key. Requests
  without a key return `401 API key missing`. (IMD also publishes key-less
  `mausam.imd.gov.in/api/...` endpoints; treat them as unofficial and
  CORS-restricted — prefer the portal.)
* **Cost:** free (government service) for standard use.
* **Env (already supported by the code):**
  ```
  IMD_RAINFALL_URL=https://api.imd.gov.in/api/v1/<district-rainfall-endpoint>
  IMD_API_KEY=<your key>
  IMD_API_KEY_HEADER=X-API-Key          # header name if IMD says otherwise
  ```
* **In this repo:** `backend/app/providers/imd.py` (fetch → normalise
  `[{district, rain_mm}]` → writes `zone_inputs` for matched districts),
  triggered by `GET /api/v1/data/imd/pull` or `POST /api/v1/data/imd`
  (`routers/ingest.py`). Without env vars it reads
  `backend/data/imd/rainfall.json`.
* **Gotchas:** response shape may be nested — adjust the small normaliser in
  `imd.py`; district names must match `backend/app/zones.py`
  (`district_to_zone()` is case-insensitive exact match).

#### A3. MOSDAC (ISRO/SAC) — 📄 satellite & gridded products
* **Gives:** INSAT/IMAGER products, gridded rainfall, snow-cover, WRF/nowcast
  products over India — the Indian alternative to NASA IMERG.
* **Portal:** <https://mosdac.gov.in> (free registration + product requests).
* **Cost:** free for registered research/operational use.
* **Where it would plug in:** as GeoTIFF/NetCDF rasters fed to LHASA via
  `-cf/-af` (Option B in `doc/REAL_DATA_GUIDE.md` §4), or daily district
  rainfall into the same IMD adapter.

#### A4. NASA IMERG / GEOS / Earthdata — 🔌 already supported (free account)
* **Gives:** global half-hourly satellite rainfall (IMERG), soil moisture
  (SMAP), forecast rainfall (GEOS-FP) — this is what `LHASA/lhasa.py`
  downloads for **real nowcasts**.
* **Portal:** <https://urs.earthdata.nasa.gov> (create free account) →
  put credentials in `~/.netrc` + `~/.dodsrc` per `LHASA/README.md`.
* **Static rasters (one-time, several GB):**
  <https://gpm.nasa.gov/sites/default/files/data/landslides/static.zip> →
  unzip into `LHASA/static/`. *(Your checkout already has them —
  `GET /api/v1/health` reports `static.present: true`.)*
* **Cost:** free.
* **Env:** `LHASA_DEMO=0` (disable sample inputs), `LHASA_PYTHON` (conda env
  interpreter), `LHASA_DIR`, `LHASA_OUTPUT_DIR`.
* **In this repo:** `backend/app/runner.py` spawns `lhasa.py`; results are
  read by `backend/app/output_reader.py`. Start with `POST /api/v1/ml/runs`.
* **Gotchas:** run needs the `lhasa` conda env (`LHASA/lhasa.yml`); NASA
  servers are occasionally down; `maps.nccs.nasa.gov` is IPv6-only.

---

### B. Soil moisture

| Source | Access | Cost | Status / where |
|---|---|---|---|
| Open-Meteo `soil_moisture_0_to_7cm` | none | free | ✅ `openmeteo.py` (drives `wetness`) |
| NASA SMAP L4 (0–5 cm / root zone, 9–11 km) | Earthdata account | free | 🔌 via A4 (`LHASA` downloads it) |
| NRSC/ISRO soil-moisture products | MOSDAC registration | free | 📄 as `-mf` raster for LHASA (Option B) |
| Ground probes in your own network | n/a (you push data) | device cost | ✅ `POST /api/v1/sensors/readings` → `inputs.refresh_zone_from_readings()` |

---

### C. Seismicity (pga is a LHASA input; quakes raise slope risk)

#### C1. USGS Earthquake Feed — ✅ wired (no key)
* **Portal:** <https://earthquake.usgs.gov/fdsnws/event/1/> · GeoJSON feeds
  (<https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/1.0_day.geojson>,
  default here: `all_week.geojson` — the past-day feed is frequently empty
  over the India bbox, which would render the map layer blank).
* **Env:** `USGS_FEED_URL` (other feeds: `all_day`, `1.0_day`,
  `significant_week`), `USGS_BBOX=west,south,east,north` (defaults to the
  project's India bbox).
* **In this repo:** `backend/app/providers/seismic.py` →
  `GET /api/v1/seismic/live?min_magnitude=2.5` → GIS map layer
  (“Live Earthquakes (USGS)”), refreshed every 10 min.
* **Cost:** free, public domain.

#### C2. National Centre for Seismology (NCS), India — 📄 official catalog
* **Portal:** <https://ncs.gov.in> · bulletins via <https://seismo.gov.in>.
* **Access:** no stable public JSON API — data on request / via NDMA
  dashboards. Use USGS for automation and NCS for official verification.

---

### D. Official warnings & bulletins

| Source | Gives | Access | Status |
|---|---|---|---|
| **IMD Warning API** (`api.imd.gov.in`, “Warning APIs”: district-wise, subdivision-wise) | colour-coded district warnings (red/orange/yellow) — ideal *input* for auto-raising alerts | free API key | 🔌 same key as A2; feed into `GET /api/v1/alerts` |
| **NHAI Highway Nowcast** (IMD portal, “NHAI API”) | highway-wise weather warnings → live `roads` status | free API key | 📄 → `GET /api/v1/roads` |
| **GDACS** <https://www.gdacs.org> (UN OCHA) | global earthquake/flood/storm alerts, API: `https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP` | none | 📄 → new `providers/gdacs.py` alongside `seismic.py` |
| **NDMA “Sachet”** <https://sachat.ndma.gov.in> | pan-India multi-hazard alerts to citizens | app-first; API on request | 📄 reference/second source for `alerts` |
| **IMD/CWC cyclone & heavy-rain advisories** | text bulletins | portal | 📄 display on Dashboard |

Suggested integration: a small poller that calls the IMD warning endpoint
every 15 min, maps district → zone (reuse `imd.district_to_zone`), and
creates `AlertRecord` rows exactly like `POST /api/v1/ml/evaluate` does —
alerts then appear on Alerts/Notifications pages automatically.

---

### E. Maps & satellite imagery (GIS page)

| Layer | Provider | Key? | Status | URL template / notes |
|---|---|---|---|---|
| Streets | OpenStreetMap | none | ✅ | `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` — keep attribution; heavy apps should use a tile host (Felt/Mapbox/OSMF), see <https://operations.osmfoundation.org/policies/tiles/> |
| Satellite | Esri World Imagery | none | ✅ | `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` — free for dev/demo with attribution; license before production |
| True-colour / thermal imagery | NASA GIBS | none | 📄 | `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/{layer}/default/{time}/{z}/{y}/{x}.jpg` (e.g. `MODIS_Terra_CorrectedReflectance_TrueColor`) |
| India-specific imagery | ISRO Bhuvan | registration | 📄 | <https://bhuvan.nrsc.gov.in> (viewer free; API on request) |
| High-res / EO tasking | Sentinel Hub (EO Browser) | free tier account | 📄 | <https://www.sentinel-hub.com> — good for before/after slide imagery |

Heatmap + zone/sensor/quake markers are already rendered by
`frontend/src/pages/GISPage.tsx` + `components/ui/HeatmapLayer.tsx`.

---

### F. Landslide inventories (validate the model; feed Historical page)

* **GSI India** — Landslide hazard maps & inventory (Geological Survey of
  India, landslide risk-mitigation publications): <https://www.gsi.gov.in> —
  downloads/PDFs; some datasets on request.
* **NDMA / National Disaster Management Authority** — landslide hazard
  zonation & the 2023 “Landslide Risk Mitigation” programme:
  <https://ndma.gov.in>.
* **DesInventar Sendai** (UNDRR) — searchable India landslide inventory
  (event records with date/location/impact): <https://desinventar.net> —
  free; good structured source to replace the mock `historical` rows.
* **NASA SEDAC landslide inventory** (Kirschbaum et al., global 1930–present):
  <https://sedac.ciesin.columbia.edu> — free registration.
* **ICIMOD** (Himalayan regional landslide inventory):
  <https://www.icimod.org> — for the HKH belt incl. Uttarakhand/Himachal/J&K.

> Status 📄 → import as JSON into `GET /api/v1/historical`
> (`_HISTORICAL_EVENTS` in `backend/app/routers/live.py`, mirrored by
> `historicalEvents` in `frontend/src/data/mockData.ts`).

---

### G. Rivers & flood (valley-bottom risk)

* **CWC Flood Forecast (FFS):** <https://ffs.india-water.gov.in> —
  station-wise flood forecasts; registration/request for API access.
  Site: <https://cwc.gov.in/flood-forecast>. 📄 → new `providers/cwc.py`
  feeding a “flood risk” badge on `RoadsPage`/`Dashboard`.
* **CWC water-level data (WLMP):** <https://indiawris.gov.in> (India-WRIS,
  registration) — river levels & reservoirs. 📄
* **State SDRF/SDMA feeds** — mostly web dashboards; scrape only with
  permission.

---

### H. Alert delivery (SMS / WhatsApp / IVR / email) — 🔌 pre-wired

Code: `backend/app/providers/notify.py`, invoked automatically by
`POST /api/v1/ml/evaluate` (the predict→warn loop) and returns
`deliveries: [...]` in the response. Default channel is `log` (safe —
nothing is sent until you configure a provider).

**India-specific rules you must know:** commercial SMS in India requires
**DLT registration** (TRAI) — a registered header (6-char sender), approved
content templates, and sender-ID per template. WhatsApp Business messages
need an approved Meta template too. Budget accordingly.

| Channel | Provider | How to get access | Cost (approx.) | Env vars |
|---|---|---|---|---|
| SMS (India, DLT) | **MSG91** <https://www.msg91.com> | signup → DLT header + template + sender id | pay-per-SMS; OTP/promo/transactional rates vary | `NOTIFY_CHANNEL=msg91`, `MSG91_API_KEY`, `MSG91_TEMPLATE_ID`, `NOTIFY_FROM=<6-char DLT sender>`, `NOTIFY_RECIPIENTS=+91...,...` |
| SMS + WhatsApp (global) | **Twilio** <https://www.twilio.com> | signup → account SID/token + a number (India sender must be registered) | per-message pricing, cheapest to prototype | `NOTIFY_CHANNEL=twilio`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`, `NOTIFY_RECIPIENTS` |
| WhatsApp (India) | **Gupshup** <https://www.gupshup.io> / **WATI** <https://www.wati.io> | Meta Business + BSP signup, template approval | conversation-based pricing | add an adapter in `notify.py` (same shape as `_send_msg91`) |
| Any webhook (Slack/Discord/custom collector) | your own endpoint | n/a | free | `NOTIFY_CHANNEL=webhook`, `NOTIFY_WEBHOOK_URL` |
| Email | **Resend** <https://resend.com> / **AWS SES** / **SendGrid** | signup → domain verify → API key | generous free tiers (Resend ≈3k/month, SES ≈3k/month from EC2) | point `NOTIFY_WEBHOOK_URL` at a small relay, or add `_send_email` next to `notify.py` |
| IVR voice calls | **MSG91 Voice / Twilio IVR** | same account | per-minute | extend `notify.py` |

**Recipients today:** `NOTIFY_RECIPIENTS` is a static list (there is no
subscriber directory yet). Next step per `doc/NER_ADAPTATION_PLAN.md` §D:
district/block/village contact table → geo-targeted fan-out using
`zone_id → district → contacts`.

**Multilingual content is already prepared:** `backend/app/i18n.py` stores
`{en, hi, as, bn, mni}` title+message on every alert — the delivery adapter
should pick the language per recipient (`translations` field on `alerts`).

---

### I. Roads & traffic (live closure status for `RoadsPage`)

* **NHAI / IMD Highway Nowcast** — official highway-segment weather warnings
  (`api.imd.gov.in` “NHAI API”, free key). 📄 best official source.
* **MapmyIndia (CE Info Systems)** — road/traffic + geocoding APIs, free dev
  tier: <https://www.mappls.com/API> (registration). 📄
* **Google Maps Platform** — Roads/Directions, pay-as-you-go with free
  monthly credit; requires billing account. 📄
* **OpenStreetMap (Overpass)** — road geometry only, no live closure state. ✅ geometry already used.
* Today `GET /api/v1/roads` derives status from model severity
  (`_status_from_risk`) + field reports; swap in NHAI/official closure feeds
  when available.

---

### J. Geocoding, places & population exposure

| Need | Source | Access | Status |
|---|---|---|---|
| Reverse geocode lat/lon → district | OSM Nominatim <https://nominatim.org> | none, strict usage policy (1 req/s, valid UA, no bulk) | 📄 |
| Indian postal/district lookup | MapmyIndia / India Post PIN API | key / public | 📄 |
| Population-at-risk raster (~100 m) | WorldPop <https://worldpop.org> (free, CC-BY) | none | 📄 → refine `population` in `backend/app/zones.py` |
| Census 2011 district tables | <https://censusindia.gov.in> | free | 📄 |

---

## 3. Environment variables — full reference (`backend/.env`)

Everything optional; defaults give the zero-signup live mode.

```bash
# ---- server ----
HOST=127.0.0.1
PORT=8000

# ---- model mode ----
LHASA_DEMO=1                  # 0 = only real NASA runs
LHASA_DIR=../LHASA             # resolved automatically in config.py
LHASA_PYTHON=python            # interpreter with the `lhasa` conda env
LHASA_CORS_ORIGINS=*

# ---- weather (live today, no key) ----
OPEN_METEO_URL=https://api.open-meteo.com

# ---- official IMD rainfall (pre-wired: providers/imd.py) ----
IMD_RAINFALL_URL=
IMD_API_KEY=
IMD_API_KEY_HEADER=X-API-Key

# ---- seismic (live today, no key) ----
USGS_FEED_URL=https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson
USGS_BBOX=68.0,6.5,97.5,36.5   # west,south,east,north (default = project bbox)

# ---- alert delivery (pre-wired: providers/notify.py) ----
NOTIFY_CHANNEL=log             # log | twilio | msg91 | webhook | off
NOTIFY_RECIPIENTS=             # +919876543210,+919000000000
NOTIFY_FROM=                   # DLT sender id / Twilio from-number
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM=
MSG91_API_KEY=
MSG91_TEMPLATE_ID=
NOTIFY_WEBHOOK_URL=

# ---- database (default: backend/lhasa.db SQLite) ----
# LHASA_DB=postgresql+psycopg://user:pass@host/db

# ---- frontend (.env in frontend/) ----
# VITE_LHASA_API_URL=           # empty = Vite dev proxy → :8000
# VITE_API_TIMEOUT_MS=4000
# VITE_POLL_INTERVAL_MS=60000
```

`backend/run.py` loads `backend/.env` automatically (python-dotenv or its
built-in parser).

---

## 4. API surface of this project (what the website calls)

| Method | Endpoint | Live source behind it |
|---|---|---|
| GET | `/api/v1/health` | readiness of model + static NASA data + demo flag |
| GET | `/api/v1/zones`, `/zones/{id}` | 27 zones + model score (live weather inputs) |
| GET | `/api/v1/dashboard/summary\|trends\|district-risk\|severity\|rainfall-risk` | model + DB + Open-Meteo |
| GET | `/api/v1/sensors`, `/sensors/{id}`, `/sensors/{id}/readings` | zone live inputs + DB readings |
| GET | `/api/v1/seismic/live` | **USGS feed (live, no key)** |
| GET | `/api/v1/roads` | model severity (+ field reports) |
| GET | `/api/v1/historical`, `/emergency/zones`, `/notifications(+/stats)` | DB + curated data |
| POST | `/api/v1/weather/refresh` | **Open-Meteo current + forecast (live)** |
| GET | `/api/v1/ml/predictions\|forecasts\|recommendations` | live NASA run → else model + Open-Meteo (incl. **forecast rainfall mm**) |
| GET | `/api/v1/ml/grid` | model-scored heatmap over India |
| POST | `/api/v1/ml/runs` | **real NASA LHASA run** (Earthdata creds) |
| POST | `/api/v1/ml/evaluate` | raises alerts + **fans out via notify.py** |
| POST | `/api/v1/sensors/readings`, `/zones/{id}/input`, `/data/imd`, `/data/imd/pull`, `/reports` | your sensors / IMD / citizens |

---

## 5. Recipes — go from “demo” to “live” in minutes

**R0 — already live (no signup):** `python backend/run.py` + `cd frontend && npm run dev`.
Weather-driven risk, forecast rainfall, quakes, satellite map, heatmap.

**R1 — official IMD rainfall (≈10 min):**
1. Create an account at <https://api.imd.gov.in> → copy your API key.
2. Add to `backend/.env`: `IMD_RAINFALL_URL=…` + `IMD_API_KEY=…`.
3. `curl http://127.0.0.1:8000/api/v1/data/imd/pull` → zone rain now labelled
   `source: imd`, and prediction factors say “Live IMD/sensor inputs”.

**R2 — real NASA nowcast (≈30 min + multi-GB downloads):**
1. `conda env create -f LHASA/lhasa.yml && conda activate lhasa`
2. Earthdata account → `~/.netrc`/`~/.dodsrc` per `LHASA/README.md`.
3. Static rasters already present (`GET /api/v1/health` confirms).
4. `LHASA_DEMO=0 python backend/run.py`, then
   `curl -X POST localhost:8000/api/v1/ml/runs -d '{"lead":3}' -H 'Content-Type: application/json'`.
5. Poll the run; once `completed`, `/ml/predictions` serve the real raster.

**R3 — real SMS alerts (≈1 day, mostly paperwork):**
1. DLT registration (header + template) with your SMS provider — MSG91/Gupshup help with this.
2. Set `NOTIFY_CHANNEL=msg91` + `MSG91_API_KEY` + `MSG91_TEMPLATE_ID` + `NOTIFY_FROM` + `NOTIFY_RECIPIENTS`.
3. For a quick *dev* proof without DLT: `NOTIFY_CHANNEL=webhook` +
   `NOTIFY_WEBHOOK_URL=https://webhook.site/<your-id>`.
4. `curl -X POST localhost:8000/api/v1/ml/evaluate` → response shows `deliveries`.

**R4 — email alerts:** Resend/SES key → tiny relay that accepts
`NOTIFY_WEBHOOK_URL` payload and sends mail (or add `_send_email()` in
`notify.py`, same adapter shape).

---

## 6. Recommended order of enablement

1. **R0** (free) — already on: Open-Meteo + USGS + Esri/OSM + local model.
2. **R1 IMD key** — makes the rainfall officially sourced (problem-statement requirement).
3. **R3 webhook → MSG91** — closes predict→warn with one real channel.
4. **R2 NASA runs** — replaces sample inputs with true nowcasts (static data is already present in this checkout).
5. MOSDAC/CWC/GSI integrations — only after 1–4 are stable.

---

## 7. Caveats

* **Attribution/licensing:** keep OSM & Esri attribution on the map; NASA
  LHASA results must cite Stanley et al. 2025 (see root `README.md`).
* **Calibration:** feeding rainfall from a non-IMERG source into LHASA shifts
  absolute probabilities (NASA's warning) — treat outputs as *relative* risk
  until validated against local landslide records (`doc/REAL_DATA_GUIDE.md` §4.3).
* **Rate limits / CORS:** IMD and some Indian portals block browser CORS —
  always call them from the FastAPI backend, never from React.
* **DLT + WhatsApp templates:** required by Indian regulation before any
  commercial SMS/WhatsApp goes out; budget 1–2 weeks for approvals.
* **Prices and endpoints change** — verify on each provider's pricing/docs
  page before committing (this file was compiled Oct 2026; IMD portal
  `api.imd.gov.in` key requirement verified then).

Related docs: [`REAL_DATA_GUIDE.md`](REAL_DATA_GUIDE.md) (feeding data into
the model), [`NER_ADAPTATION_PLAN.md`](NER_ADAPTATION_PLAN.md) (roadmap),
[`../backend/README.md`](../backend/README.md) (server operations).
