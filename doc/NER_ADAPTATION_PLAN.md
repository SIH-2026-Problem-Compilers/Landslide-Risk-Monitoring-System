# NER (North East India) Adaptation Plan

> **Goal.** Adapt the current Nepal landslide-monitoring prototype into the
> platform described in the *North Eastern Region (NER) early warning*
> problem statement: an AI-enabled, real-time landslide monitoring and early
> warning system for India's North Eastern Region.

This document is a **fit/gap analysis**: what already matches the
requirements, what must change, and the recommended order of work. Everything
is referenced to the actual files in this repository.

---

## 1. Fit / gap summary

| Problem-statement requirement | Current state | Verdict |
|---|---|---|
| GIS dashboard & risk severity view | `GISPage`, `DashboardPage`, `SeverityBadge` | ✅ fits (data is Nepal mock) |
| AI/ML predictive engine | NASA LHASA `model.json` scored per zone (`backend/app/scorer.py`, real-run path too) | ✅ fits globally incl. NER — needs region retargeting |
| Weather-linked risk forecasts (24/48/72h) | `PredictionsPage` forecast cards + backend forecasts | ✅ fits (demo trend; IMD integration missing) |
| Road connectivity status | `RoadsPage` + `Road` type | ✅ fits (mock roads are Nepal) |
| Emergency response prioritisation | `EmergencyPage` (priority ranking, population at risk) | ✅ fits (mock data) |
| Risk heatmaps | layer list in `GISPage` only, no real raster layer | ⚠️ partially — needs LHASA heatmap overlay service |
| Citizen/field reports w/ geo-tagged photos/videos | `ReportSubmitPage` + `ReportsPage` (UI + mock) | ⚠️ UI only — needs backend upload/storage + moderation |
| Rainfall/soil-moisture/satellite/historical data collection | all **mock** data in `frontend/src/data/mockData.ts` | ❌ needs real ingestion (IMD, sensors, history) |
| Real-time alerts to district/state authorities & communities | `AlertsPage`, `NotificationsPage` (mock); multi-channel types exist | ⚠️ needs real delivery (SMS/app/WhatsApp/IVR) + geo-targeting |
| Multilingual notifications | no i18n anywhere | ❌ needs language framework + translations |
| Low-network / offline support | none (no PWA / service worker / offline queue) | ❌ needs PWA + offline report queue + cached maps |
| IMD weather API integration | not present | ❌ needs adapter (see §3.C) |
| Cloud-based, scalable architecture | local FastAPI + Vite only; JSON file state | ❌ needs DB, object storage, scheduler, containers |

**Bottom line:** the dashboard *shell* and the *ML engine* are the strongest
assets. The work is mostly (1) repointing geography India/NER, (2) replacing
mock data with real ingestion + storage, and (3) adding the missing
infrastructure (IMD, multilingual, offline, delivery).

---

## 2. Geographic rebase — Nepal → North Eastern Region (India)

The entire dataset is Nepal. This is the first and cheapest change and
touches both frontend and backend.

| What | Where | Change |
|---|---|---|
| Monitoring zones (10 today) | `backend/app/zones.py`, `frontend/src/data/mockData.ts` (`riskZones`) | Replace with NER districts across the 8 states, e.g. Meghalaya (East Khasi Hills, West Garo Hills), Mizoram (Aizawl, Lunglei), Nagaland (Kohima, Dimapur), Manipur, Tripura, Assam hill districts, Arunachal, Sikkim. Keep ids + `district`/`state` fields. |
| Map center / zoom | `frontend/src/pages/GISPage.tsx` `center={[27.7, 85.5]}` zoom 8 | NER centre ≈ `[26.0, 93.0]`, zoom 6–7 |
| LHASA run bounding box | `backend/app/config.py` `DEFAULT_BBOX` (Nepal 26–31°N, 80–89°E) | NER box ≈ N `29.5`, S `21.5`, E `97.0`, W `88.0` (IMERG is global; LHASA supports any box) |
| Demo/sample terrain params | `backend/app/scorer.py` `ZONE_PARAMS` | NER slopes/lithology assumptions per new zone list |
| Mock districts/states/roads/sensors/historical | `frontend/src/data/mockData.ts` + hard-coded `'Bagmati'`, `'Gandaki'` in `HistoricalPage.tsx` filters | Rebuild mock corpus around NER districts + real road corridors (NH-6, NH-306, NH-37, NH-54, hill district roads) |
| Auth/users/emails | `frontend/src/services/authService.ts`, `LoginPage`, `Navbar`, `SettingsPage` (`admin@ner.gov.np`, district `Sindhupalchok`) | `admin@ner.gov.in` style, roles → NER state SDMA / district disaster management / citizen |
| User roles | `UserRole` type ('admin' | 'disaster_officer' | 'citizen') | Extend: `sdma`/`ndma`, `field_official`, `block_official` |

> Suggestion: keep one real pilot geography (e.g., **Meghalaya + Mizoram**,
> the most landslide-prone states) instead of spreading mock data over all 8
> states — it keeps the demo believable and matches real IMD/SDMA contacts.

---

## 3. Change areas by capability

### A. Predictive engine (mostly reuse, retarget)

Already done: LHASA model integration, `/predictions | /forecasts |
/recommendations`, demo scorer, real-run runner (`backend/app/runner.py`).

Changes:
1. **Zone table swap** (§2) — new NER zones in `zones.py`; the API needs no
   structural change because it samples by zone coordinates.
2. **Region defaults** — bbox above; optionally switch API run output sampling
   from zone points to a grid so a **heatmap layer** can be built:
   - new endpoint `GET /api/v1/ml/grid?bbox=…&step=0.05` returning
     `{lat, lon, p}` points from the last completed run's netCDF (reuse
     `output_reader`), rendered with `leaflet.heat`.
3. **Historical landslide inventory for NER** — LHASA cannot be retrained with
   the released files; instead use NER landslide inventories (GSI landslide
   database, BISAG/NDMA records) to (i) validate LHASA probabilities and (ii)
   rank zones (frequency × exposure) in `EmergencyPage`.
4. **Local AI signals** the statement lists that LHASA doesn't model
   (hill-cutting, slope failure precursors) → add sensor-based scoring
   (Option C in `doc/REAL_DATA_GUIDE.md`) and image/vision checks for
   crack-detection on submitted photos (optional, later).

### B. Data collection & storage (today: all mock, nothing persisted)

Add a real persistence + ingestion layer to the FastAPI backend:

1. **Database** — Postgres (SQLAlchemy) for zones, alerts, reports, readings,
   notifications, users. Replace the current JSON `RunStore` only for runs
   (fine as is) but persist domain data in Postgres.
   Recommended providers: see Gravity Index (e.g., Neon/Supabase serverless
   Postgres for hackathon, RDS for production).
2. **Ingestion endpoints**:
   - `POST /api/v1/sensors/readings` — IoT soil-moisture + rain gauges push
     (LoRa/cellular gateways in NER). Feeds the scorer's `wetness`/`rain`
     per zone (already designed in `REAL_DATA_GUIDE.md` §5).
   - `POST /api/v1/reports` — geo-tagged photo/video uploads
     (multipart → object storage, S3-compatible), status workflow
     `pending → verified → investigating → resolved`.
   - `POST /api/v1/roads/{id}/status` — field officials update blockages.
3. **Satellite/terrain** — static terrain for NER is *already inside* the
   global LHASA static rasters (`Slope`, `Lithology`, `pga` cover India);
   no new terrain data needed for the model. Satellite imagery for
   situational awareness can come from NASA products or ISRO
   Bhuvan/MOSDAC later (optional).
4. **Scheduler** — daily job (cron / APScheduler) that runs the LHASA
   nowcast for the NER bbox so `/predictions` is always fresh (mirrors
   `lhasa.sh` cadence). NASA data route requires Earthdata creds (see
   `REAL_DATA_GUIDE.md` §3); without it, keep sensor-driven scorer as the
   live path.

### C. IMD weather integration (replace/augment NASA IMERG)

The statement asks for **IMD weather APIs**. Two integration levels:

1. **Light (recommended first):** IMD/MOSDAC district rainfall APIs → poll
   daily, store rain per district, feed as the `rain`/`antecedent` inputs of
   the scorer (route C). Verify current IMD API endpoints/keys
   (imdpune.gov.in gridded rainfall, MOSDAC `mosdac.gov.in`) — access often
   needs registration; check the provider's current docs before coding.
2. **Full:** IMD gridded rainfall GeoTIFFs/NetCDF as `-cf/-af` inputs to the
   real `lhasa.py` run (Option B in `REAL_DATA_GUIDE.md`), replacing NASA
   IMERG. Requires regridding IMD 0.25° grids onto the 1 km model grid —
   `lhasa.py` already regrids any input.
3. **Forecast linkage** — merge IMD 3–5 day district forecasts with LHASA
   probabilities so the forecast cards show "weather-linked risk"
   (`Forecast.rainfall` becomes non-null from IMD).

### D. Alerts & notifications (multi-channel, multilingual)

Existing UI: `AlertsPage`, `NotificationsPage`, types already include
`channel: sms | email | whatsapp | ivr` and delivery stats.

Changes:
1. **Delivery backend** — provider adapters (e.g., India SMS gateways —
   MSG91, Gupshup, Twilio; email — SES/Resend). Do not build from memory:
   check the Gravity Index for current providers + free tiers, then implement
   a `delivery` service with per-channel adapters.
2. **Geo-targeting** — alert → list of affected `zoneId`s → subscriber
   directory (district/block/village contacts) fetched from DB.
3. **Severity-triggered rules** — new backend service: when a run or sensor
   stream pushes a zone above threshold, auto-create an `Alert` and fan out
   via configured channels (this closes the loop "predict → warn").
4. **Multilingual content** — template per language:
   English, Assamese, Bengali, Hindi, Mizo, Khasi, Garo, Nagamese, Nepali,
   Manipuri. Language stored per subscriber/device; `notification.content` as
   `{lang: text}` map.

### E. Frontend language & offline support

1. **i18n** — add `react-i18next` (or a light dictionary) to
   `frontend/`; wrap the ~15 pages' strings; add language switcher in
   `MainLayout`/`Navbar`. Keep English default. Types/UI are 100% hard-coded
   English today — this is the largest pure-frontend task; do it
   incrementally (top pages first: Landing, Login, Dashboard, Alerts,
   ReportSubmit).
2. **PWA / offline** — `vite-plugin-pwa`: manifest + service worker
   (precache app shell, cache map tiles), **offline queue** for
   `ReportSubmitPage` (queue report in IndexedDB, sync on reconnect) —
   directly answers "low-network/offline functionality for remote areas".
3. **Map for low bandwidth** — allow tile layer switch (OSM ↔ low-res/offline
   tiles), debounce report uploads.

### F. GIS layers & heatmaps (NER assets)

`GISPage` already toggles villages/roads/hospitals/schools/bridges/sensors,
but renders only zone + sensor markers.

Changes:
1. **Real GeoJSON layers** for NER: district boundaries, national/state
   highways, villages (census), hospitals/schools/helipads/bridges →
   served by backend `/api/v1/layers/{kind}`.
2. **LHASA heatmap overlay** from §3.A.2 (risk heatmap requirement).
3. Keep sensor + zone popups; add photo evidence pins for verified reports.

### G. Cloud & operations

| Area | Change |
|---|---|
| Deployment | Containerize `backend/` (Dockerfile + uvicorn), frontend static build on CDN/object storage |
| DB & storage | Postgres + S3-compatible object storage (photos/videos) |
| Scheduler | daily LHASA/IMD/sensor ingest job (cloud cron / APScheduler) |
| Auth | real JWT/OAuth roles (SDMA admin, field officer, citizen) instead of prototype auto-login |
| Scale | stateless API (runs still need a worker or separate job container), rate limiting on uploads |

---

## 4. Recommended order (phased)

**Phase 0 — Retarget demo (half a day)**
- Swap zones/districts/map centre/bbox/users to NER (§2), rebuild mock corpus
  around 1–2 pilot states (Meghalaya, Mizoram).
- Result: the whole app demos correctly for NER with LHASA predictions on NER
  districts.

**Phase 1 — Real data loop (core differentiator)**
- Postgres + ingestion endpoints (sensors, reports+photos, road status).
- IMD rainfall adapter → feeds scorer; scheduler refreshes predictions daily.
- Sensor-driven scoring (already designed) so demo/real both use live inputs.
- Auto-alert rule engine + one real notification channel (SMS).

**Phase 2 — NER-specific UX**
- i18n (4–6 languages), PWA + offline report queue, heatmap + GeoJSON layers,
  multilingual notification templates.

**Phase 3 — Production hardening**
- Cloud deploy, object storage, auth, monitoring, geo-targeted fan-out
  to SDMA/district directories.

---

## 5. File-level quick reference

| Task | Primary files |
|---|---|
| NER zones + bbox + map centre | `backend/app/zones.py`, `backend/app/config.py`, `frontend/src/pages/GISPage.tsx`, `frontend/src/pages/HistoricalPage.tsx` |
| Mock data rebuild (NER) | `frontend/src/data/mockData.ts`, `frontend/src/pages/*` (filters), `frontend/src/services/authService.ts` |
| Heatmap + grid endpoint | `backend/app/main.py`, `backend/app/output_reader.py`, `frontend/src/pages/GISPage.tsx` (leaflet.heat) |
| Sensor/report/road ingestion + DB | new `backend/app/models.py`, `backend/app/routers/*.py`, `backend/requirements.txt` |
| IMD adapter | new `backend/app/providers/imd.py`, `backend/app/scorer.py` (input wiring) |
| Auto-alerts + delivery | `backend/app/main.py`, new `backend/app/alerts.py`, `backend/app/notify.py` |
| i18n | `frontend/package.json`, new `frontend/src/i18n/*`, all pages, `Navbar` |
| PWA/offline | `frontend/vite.config.ts`, new `frontend/public/sw.js`, `ReportSubmitPage` |
| GeoJSON layers | `backend/app/routers/layers.py`, `frontend/src/pages/GISPage.tsx` |

---

## 6. Open questions (decide before coding)

1. **Pilot geography** — all 8 NER states in mock data, or 1–2 pilot states
   (Meghalaya/Mizoram) with believable data?
2. **Weather data** — do you have (or can you register for) IMD/MOSDAC API
   access, or should the model keep running on sensor data + optional NASA?
3. **Notifications** — which channels for the MVP: SMS gateway, WhatsApp
   Business API, or in-app push only?
4. **Scale of run** — local docker for the demo, or a cloud account
   (which one)?
