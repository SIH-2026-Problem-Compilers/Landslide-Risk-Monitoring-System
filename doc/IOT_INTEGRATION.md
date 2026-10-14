# IoT Integration Guide — ESP32 field stations (optional)

> **IoT is optional.** Every feature of this platform keeps working without
> any hardware: the model is driven by live Open-Meteo weather, and all pages
> render from the API. An ESP32 station simply *replaces* the estimated
> weather values for its zone with real ground-truth measurements — the
> strongest upgrade path for the predict→warn loop.

---

## 1. Component relevance analysis

From the available hardware list, only what maps to landslide risk is used:

| Component | Verdict | Why / how it is used |
|---|---|---|
| **ESP32 Dev Module** | ✅ **required core** | Wi-Fi microcontroller that reads the sensors and pushes them to `POST /api/v1/sensors/readings/batch`. Deep-sleep capable (~10 µA) for solar/battery field deployment. |
| **HW-103 soil-moisture sensor** | ✅ **primary sensor** | Soil saturation is LHASA's live input `gwetprof` (0–1 wetness). This single value changes zone risk scores the most — it is *the* sensor that matters here. |
| **DHT11 temperature + humidity** | ✅ **used (context)** | Ambient temperature + relative humidity shown on the Sensors page and stored per zone; humidity supports the "saturation approaching threshold" narrative next to the model score. |
| **LM35 temperature sensor** | ✅ **used (alternative)** | Redundant temperature channel — use it if you don't have a DHT11, or wire both (firmware flag `USE_LM35`). |
| **pH sensor** | ❌ **not used** | Measures soil/water chemistry — no LHASA input and no landslide physics. Left out deliberately. (It would belong in a water-quality project.) |
| **ACS712 current sensor** | ⚠️ **optional only** | Not a landslide input. Useful for one thing: watching the station cabinet's own mains supply (0 A = grid failure → run on battery, raise a maintenance alert). Enabled with the `USE_ACS712` flag. |

### Suggested optional additions (only if you want to go further)

| Optional component | Purpose | Quick connection |
|---|---|---|
| **Tipping-bucket rain gauge (0.2 mm)** | Gives a *real* `rain` mm value — the other LHASA live input. Best possible upgrade after the soil probe. | Reed switch → GPIO 27 + 10 kΩ pull-up to 3V3; count tips (interrupt), mm = tips × 0.2 |
| **MEMS inclinometer (SCA100T / MPU-6050 / MMA8452)** | Direct slope-creep detection (tilt in °) — the precursor LHASA cannot see | I2C: SDA→GPIO21, SCL→GPIO22, 3V3, GND, 4.7 kΩ pull-ups |
| **LoRa module (Ra-02 / SX1278)** | Cover hilltops with no cellular/Wi-Fi; second LoRa node as the gateway that posts to the API | SPI: SCK18/MISO19/MOSI23/CS5, RST→GPIO14, DIO0→GPIO26 |
| **DS3231 RTC** | Accurate timestamps after deep sleep (ESP32 clock drifts) | I2C on the same bus as the inclinometer |
| **microSD module** | Buffer readings offline when the network drops; upload on reconnect | SPI (separate CS, e.g. GPIO15) |
| **Solar kit: 6 V/2 W panel + TP4056 + 18650 + AMS1117-3.3** | Year-round unattended power | panel→TP4056→18650→AMS1117→3V3 rail (§3.4) |
| **INA219** | Battery voltage/current telemetry (push as readings so the dashboard shows station health) | I2C, in series with the battery |
| **Buzzer + LED (GPIO 25/26)** | Local evacuation siren once the API returns a `severe` alert for the zone (future endpoint) | transistor-driven, separate 5 V supply |

---

## 2. How IoT fits the existing architecture (nothing breaks)

```
ESP32 station  ──POST /api/v1/sensors/readings/batch──►  FastAPI backend
                                                             │
   sensor_readings table (SQLite) ◄──────────────────────────┤
                                                             ▼
   zone_inputs table: soil % → wetness, rainfall mm → rain   (inputs.py)
                                                             │
                                                             ▼
   scorer.py scores the REAL LHASA model with the zone's live values
   → /api/v1/zones, /ml/predictions, dashboard, alerts all update
                                                             │
   /api/v1/sensors also *discovers* new station ids automatically
   → they appear on the Sensors page & GIS map with no code change
```

* Existing endpoints and the whole UI are unchanged — IoT just writes rows.
* If a station goes silent, its zone falls back to Open-Meteo values, then to
  the calibrated samples: **graceful degradation, never a hard dependency.**
* Mapping (`backend/app/inputs.py` → `refresh_zone_from_readings`):
  `sensor_type="rainfall"` (unit mm) → zone `rain`;
  `sensor_type="soil_moisture"` with unit `%` → zone `wetness` (÷100);
  `temperature` / `humidity` / others → stored + displayed, not model inputs.

---

## 3. Wiring & power

### 3.1 Pin assignments (firmware defaults)

| ESP32 GPIO | Function | Notes |
|---|---|---|
| 34 | HW-103 soil moisture **AOUT** | input-only pin, ADC1 (Wi-Fi safe) |
| 4 | DHT11 **DATA** | with 10 kΩ pull-up to 3V3 |
| 35 | LM35 **OUT** (optional) | ADC1 |
| 32 | ACS712 **OUT** (optional) | ADC1 |
| 3V3 | sensor supply (HW-103, DHT11) | from the ESP32 3V3 rail |
| 5V/VIN | LM35 supply, ACS712 supply | from USB/5 V input |
| GND | common ground | all modules |

Avoid GPIO 6–11 (flash), GPIO 0/2/12/15 (boot strapping), and **never use
ADC2 pins (GPIO 0,2,4?,9,10,13,14,15,25,26,27…) for analog while Wi-Fi is
on** — ADC2 is unusable with an active Wi-Fi connection. The pins above are
all ADC1, which is safe.

### 3.2 Wiring tables

**HW-103 soil-moisture sensor (primary)**

| HW-103 pin | ESP32 pin |
|---|---|
| VCC | **3V3** (not 5V — see note) |
| GND | GND |
| AOUT | GPIO 34 |

> ⚠️ Power the HW-103 from **3.3 V**. At 5 V its AOUT can reach ~5 V when the
> probe is dry, which would damage the ESP32 ADC (max 3.3 V).
> Calibrate once: read the raw value in air and in water
> (Serial Plotter) and set `SOIL_DRY_RAW` / `SOIL_WET_RAW` in the sketch.
> Typical at 3.3 V: dry ≈ 3150, wet ≈ 1350.

**DHT11 temperature + humidity**

| DHT11 pin | ESP32 pin |
|---|---|
| VCC | 3V3 |
| GND | GND |
| DATA | GPIO 4 + **10 kΩ pull-up to 3V3** (many breakout boards already include it) |

**LM35 temperature (optional / alternative to DHT11)**

| LM35 pin | ESP32 pin |
|---|---|
| VCC | **5V** (LM35 needs ≥ 4 V) |
| GND | GND |
| OUT | GPIO 35 — output is only ~10 mV/°C (≤1.5 V), so it is ADC-safe |

**ACS712 current (optional, cabinet power health)**

| ACS712 pin | ESP32 pin |
|---|---|
| VCC | 5V |
| GND | GND |
| OUT | GPIO 32 **via 10 kΩ/10 kΩ voltage divider** (out can reach ~4.5 V) |

> If you fit the divider, multiply the result by 2 in
> `readMainsCurrentRms()` (`float amps = rmsVolts * 2 / 0.100f;`).

**pH sensor** — intentionally not connected (see §1).

### 3.3 Reference schematic (text)

```
        5V (USB or AMS1117-3.3 out of battery kit)
         │
         ├── LM35 VCC            ── LM35 OUT ── GPIO35
         ├── ACS712 VCC          ── OUT ── 10k ─┬─ 10k ── GND ── GPIO32
         │                                      │
  ESP32 3V3 ── HW-103 VCC                     (tap = GPIO32)
         │   └─ DHT11 VCC (10k pull-up DATA→3V3)
         │
  ESP32 GND ── all module GND
```

### 3.4 Power requirements

| Item | Spec |
|---|---|
| ESP32 peak (Wi-Fi TX) | ~250–500 mA → use a **5 V / 1 A** supply (USB charger is fine) |
| ESP32 deep sleep | ~10 µA |
| Typical duty cycle | wake 15 s every 10 min → **average ≈ 15–25 mA** |
| Battery runtime (18650 1200 mAh usable) | ≈ 2–3 days without solar; add solar for unattended use |
| Solar option | 6 V/2 W panel → TP4056 (with protection) → 18650 → AMS1117-3.3 → 3V3 rail; 5 V loads (LM35/ACS712) tap before the regulator |
| Wi-Fi range outdoors | 20–30 m typical; use an external-antenna ESP32 variant or a LoRa bridge for hilltop sites |

---

## 4. Firmware setup

Sketch: **`hardware/esp32/lhasa_station/lhasa_station.ino`**

1. **Arduino IDE 2.x** → *Preferences → Additional Boards Manager URLs*:
   `https://dl.espressif.com/dl/package_esp32_index.json`
   → *Boards Manager* → install **esp32 by Espressif** → select
   **ESP32 Dev Module**.
2. **Libraries** (*Tools → Manage Libraries*):
   * `DHT sensor library` — Adafruit
   * `Adafruit Unified Sensor` — Adafruit (dependency)
   * `ArduinoJson` — Benoit Blanchon (v6 or v7)
   * `WiFi` and `HTTPClient` ship with the ESP32 core.
3. **Edit the configuration block** at the top of the sketch:

   | Constant | Meaning |
   |---|---|
   | `WIFI_SSID` / `WIFI_PASSWORD` | 2.4 GHz network (ESP32 has no 5 GHz radio) |
   | `API_HOST` / `API_PORT` | LAN IP of the machine running `backend/run.py` (find it with `ipconfig`), port 8000. ESP32 talks to FastAPI **directly**, not through the Vite dev proxy. |
   | `INGEST_TOKEN` | must match `SENSOR_INGEST_TOKEN` in `backend/.env` (leave both empty to disable auth) |
   | `STATION_ID` | e.g. `ESP32-A01` → readings are named `ESP32-A01-SOIL`, `-TEMP`, `-HUM` |
   | `ZONE_ID` | the monitoring zone this station measures — ids `rz-001`…`rz-027` (`backend/app/zones.py`) |
   | `SEND_INTERVAL_MIN` / `USE_DEEP_SLEEP` | upload cadence & power mode |
   | `USE_LM35` / `USE_ACS712` | uncomment the optional sensors you wired |
   | `SOIL_DRY_RAW` / `SOIL_WET_RAW` | your HW-103 calibration |
4. **Flash** (USB cable): Upload → open **Serial Monitor at 115200 baud** —
   you should see the Wi-Fi join, the JSON payload and the server's `200 OK`.

---

## 5. Backend setup (one-time)

```bash
cd backend
# optional: protect the ingest endpoint
echo "SENSOR_INGEST_TOKEN=my-secret" >> .env
python run.py           # http://127.0.0.1:8000
```

Nothing else — `POST /api/v1/sensors/readings(/batch)` stores rows in the
existing `sensor_readings` table and refreshes the zone's live inputs.

---

## 6. Testing steps

**Bench test (5 minutes, no rain needed)**

1. Flash the sketch, watch the serial log → expect `[http] 200 OK: {"ok": true, "stored": 3, "errors": []}`.
2. Verify the rows landed:
   ```bash
   curl "http://127.0.0.1:8000/api/v1/sensors/readings?zone_id=rz-016&limit=5"
   ```
3. The station **auto-appears** on the sensors list:
   ```bash
   curl http://127.0.0.1:8000/api/v1/sensors | grep ESP32
   ```
4. Confirm the model picked the values up (factor changes to
   *"Live IMD/sensor inputs"*):
   ```bash
   curl http://127.0.0.1:8000/api/v1/zones/rz-016 | python -m json.tool
   ```
5. **Simulate wet soil:** hold the probe tips in a wet cloth / glass of water,
   wait one upload cycle → zone `wetness` rises and the risk score on
   `/predictions` (Predictions page) moves up. Dry the probe → it falls.
6. Frontend: open **Sensors** page → `ESP32-A01-SOIL/TEMP/HUM` cards appear
   within the poll interval (default 60 s) with live values and a 24 h chart;
   the **GIS** page shows the station marker at its zone's coordinates.

**Token test (if enabled)**

```bash
# wrong/missing token -> 401
curl -X POST http://127.0.0.1:8000/api/v1/sensors/readings \
     -H "Content-Type: application/json" \
     -d '{"sensor_id":"SNS-X","zone_id":"rz-016","sensor_type":"soil_moisture","value":55,"unit":"%"}'

# with token (header or ?token=)
curl -X POST http://127.0.0.1:8000/api/v1/sensors/readings \
     -H "Content-Type: application/json" -H "X-Sensor-Token: my-secret" \
     -d '{"sensor_id":"SNS-X","zone_id":"rz-016","sensor_type":"soil_moisture","value":55,"unit":"%"}'
```

---

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `[wifi] FAILED` | 5 GHz network, wrong password, weak signal | use a 2.4 GHz SSID; move closer; external-antenna ESP32 |
| `[http] FAILED code=-1 / connection refused` | wrong `API_HOST`, backend not running, port blocked | check IP (`ipconfig`), start `python backend/run.py`, allow Python through the firewall, use `http://` (not https) |
| `401 Invalid or missing sensor ingest token` | token mismatch | make `INGEST_TOKEN` and `SENSOR_INGEST_TOKEN` identical (no quotes/spaces) |
| `404 Unknown zone_id` | typo in `ZONE_ID` | use an id from `backend/app/zones.py` (`rz-001`…`rz-027`) |
| Soil reading stuck at 0 % or 100 % | uncalibrated probe / powered at 5 V | recalibrate `SOIL_DRY_RAW`/`SOIL_WET_RAW`; power from 3V3 |
| Soil values noisy | ESP32 ADC noise, probe touching soil | average (sketch already averages 16 samples); keep probe body out of soil |
| DHT returns NaN | missing pull-up, too-long wire, <1 s after power-up | add 10 kΩ pull-up; shorten wires; the sketch already delays 2.5 s |
| LM35 reads ~0 °C | powered from 3V3 (needs ≥4 V) | move VCC to 5V |
| ACS712 reads oddly high | output exceeding ADC range | add the 10 k/10 k divider (§3.2) |
| Values only update when awake | deep sleep is normal | expected: one reading per wake cycle; charts interpolate |
| Chip reboots at Wi-Fi start | weak 5 V supply | use a 5 V/1 A supply (caps for bulk capacitance) |
| ADC values wrong with Wi-Fi on | ADC2 pin used | use ADC1 pins only (32/34/35 as in this guide) |

---

## 8. Security & deployment notes

* `SENSOR_INGEST_TOKEN` is a simple shared secret — fine on a trusted LAN or
  VPN. For public internet deployments put the API behind TLS (Caddy/nginx)
  or a VPN (Tailscale/WireGuard), and prefer a per-station token model.
* The platform stores readings indefinitely in SQLite; for many stations over
  months, move to Postgres (`LHASA_DB` env) and downsample old rows.
* 20–50 stations is comfortable for this single-process setup; beyond that,
  add a queue (MQTT → worker) — see `doc/NER_ADAPTATION_PLAN.md` §B.
* Data flow & alternative sources (IMD, NASA, MOSDAC) for every sensor type:
  [`INDIA_LIVE_DATA_APIS.md`](INDIA_LIVE_DATA_APIS.md).

Related: [`REAL_DATA_GUIDE.md`](REAL_DATA_GUIDE.md) §5 (Option C — sensor
network feeding the model), `backend/app/routers/ingest.py` (ingest API),
`hardware/esp32/lhasa_station/lhasa_station.ino` (firmware).
