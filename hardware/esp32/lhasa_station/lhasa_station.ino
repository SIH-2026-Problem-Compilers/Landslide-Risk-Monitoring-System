// =============================================================================
//  LHASA India — ESP32 Landslide Field Station
// -----------------------------------------------------------------------------
//  Battery/solar-friendly soil-climate station for the landslide early-warning
//  platform in this repository. Every wake cycle it reads the attached
//  sensors and pushes one batch to the FastAPI backend, which feeds the
//  values straight into the NASA LHASA model inputs for its zone:
//
//    HW-103 soil moisture  ->  'rain'/'wetness' of the zone  (model input!)
//    DHT11 temp + humidity ->  'temperature' + 'humidity' context readings
//    LM35    (optional)    ->  redundant/backup temperature
//    ACS712  (optional)    ->  mains/power health of the station cabinet
//
//  Full wiring, power and troubleshooting guide:  doc/IOT_INTEGRATION.md
//  Backend endpoints used:
//    POST /api/v1/sensors/readings/batch   (this sketch)
//    GET  /api/v1/sensors                  (the station appears here)
//
//  The platform is NOT IoT-dependent: everything keeps working without this
//  station (Open-Meteo weather drives the model until real sensors report).
//
//  Libraries (Arduino IDE -> Library Manager):
//    - "DHT sensor library"        by Adafruit        (DHT11/22)
//    - "Adafruit Unified Sensor"   by Adafruit        (dependency of above)
//    - "ArduinoJson"               by Benoit Blanchon  (>= v6, v7 works)
//    - WiFi + HTTPClient           (built into the ESP32 Arduino core)
//
//  Board: "ESP32 Dev Module" (Arduino-ESP32 core 2.x/3.x)
// =============================================================================

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// -----------------------------------------------------------------------------
// 1. CONFIGURATION — edit these for your deployment
// -----------------------------------------------------------------------------
static const char* WIFI_SSID     = "YOUR_WIFI_SSID";
static const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Backend (this repo). Example LAN: 192.168.1.50 port 8000.
// If the backend sits behind the Vite dev proxy only, point at the FastAPI
// server directly — ESP32 cannot use the frontend proxy.
static const char* API_HOST      = "192.168.1.50";
static const int   API_PORT      = 8000;
static const char* API_PATH      = "/api/v1/sensors/readings/batch";

// Optional shared secret. Set the same value in backend/.env as
//   SENSOR_INGEST_TOKEN=<token>   (leave both empty to disable auth)
static const char* INGEST_TOKEN  = "";

// Identity: one station id + the monitoring zone it belongs to
// (zone ids: rz-001 .. rz-027, see backend/app/zones.py)
static const char* STATION_ID    = "ESP32-A01";   // becomes ESP32-A01-SOIL, -TEMP, -HUM
static const char* ZONE_ID       = "rz-016";      // e.g. Joshimath Slopes (Chamoli)

// Send cadence & power
static const int   SEND_INTERVAL_MIN = 10;   // minutes between uploads
static const bool  USE_DEEP_SLEEP    = true; // true = ~10 uA between wakes

// -----------------------------------------------------------------------------
// 2. PIN MAP  (matches doc/IOT_INTEGRATION.md wiring tables)
// -----------------------------------------------------------------------------
#define PIN_SOIL_MOISTURE  34   // HW-103 AOUT (GPIO34 = input-only, 12-bit ADC)
#define PIN_DHT            4    // DHT11 data (10 k pull-up to 3V3)
#define PIN_LM35           35   // optional LM35 OUT (analog)
#define PIN_ACS712         32   // optional ACS712 OUT (analog)

#define DHT_TYPE           DHT11

// Uncomment the optional sensors you have wired:
//#define USE_LM35
//#define USE_ACS712
//#define ACS712_RANGE       20   // amps: 5A / 20A / 30A module variant

// -----------------------------------------------------------------------------
// 3. SENSOR CALIBRATION
// -----------------------------------------------------------------------------
// HW-103 (capacitive probe, ratiometric): read raw ADC in each medium once
// with the Serial Plotter, then set these. Typical at 3.3 V supply:
//   probe in air (dry) ~ 3000-3300, probe in water (wet) ~ 1200-1500
static const int SOIL_DRY_RAW = 3150;
static const int SOIL_WET_RAW = 1350;
static const float ADC_VREF   = 3.3f;        // ESP32 ADC full scale
static const int   ADC_MAX    = 4095;

DHT dht(PIN_DHT, DHT_TYPE);

// -----------------------------------------------------------------------------
// 4. HELPERS
// -----------------------------------------------------------------------------
float readSoilMoisturePercent() {
  // Average several samples; the ESP32 ADC is noisy.
  long sum = 0;
  for (int i = 0; i < 16; i++) {
    sum += analogRead(PIN_SOIL_MOISTURE);
    delay(5);
  }
  int raw = (int)(sum / 16);
  float pct = 100.0f * (float)(SOIL_DRY_RAW - raw) / (float)(SOIL_DRY_RAW - SOIL_WET_RAW);
  if (pct < 0) pct = 0;
  if (pct > 100) pct = 100;
  return pct;   // 0 % = bone dry, 100 % = saturated
}

#ifdef USE_LM35
float readLm35Celsius() {
  long sum = 0;
  for (int i = 0; i < 16; i++) {
    sum += analogRead(PIN_LM35);
    delay(5);
  }
  float volts = (float)(sum / 16) / ADC_MAX * ADC_VREF;
  return volts * 100.0f;   // LM35: 10 mV per °C
}
#endif

#ifdef USE_ACS712
float readMainsCurrentRms() {
  // 0 A sits at VCC/2 (~2.5 V on a 5 V module); sensitivity depends on the
  // variant: 185 mV/A (5 A), 100 mV/A (20 A), 66 mV/A (30 A).
  // First sample the zero point (with no load), then compute RMS.
  const int SAMPLES = 500;
  long zeroSum = 0;
  for (int i = 0; i < SAMPLES; i++) zeroSum += analogRead(PIN_ACS712);
  float zeroVolts = (float)zeroSum / SAMPLES / ADC_MAX * ADC_VREF;

  float sumSq = 0;
  for (int i = 0; i < SAMPLES; i++) {
    float v = (float)analogRead(PIN_ACS712) / ADC_MAX * ADC_VREF - zeroVolts;
    sumSq += v * v;
    delayMicroseconds(200);
  }
  float rmsVolts = sqrt(sumSq / SAMPLES);
#if ACS712_RANGE == 5
  return rmsVolts / 0.185f;
#elif ACS712_RANGE == 30
  return rmsVolts / 0.066f;
#else
  return rmsVolts / 0.100f;   // 20 A module
#endif
}
#endif

bool connectWifi(uint32_t timeoutMs = 20000) {
  Serial.printf("[wifi] connecting to %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < timeoutMs) {
    delay(250);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[wifi] FAILED — will retry next wake cycle");
    return false;
  }
  Serial.print("[wifi] connected, IP = ");
  Serial.println(WiFi.localIP());
  return true;
}

// Adds one reading object to the JSON array
void addReading(JsonArray& arr, const char* sensorSuffix,
                const char* type, float value, const char* unit) {
  JsonObject o = arr.add<JsonObject>();
  char sensorId[40];
  snprintf(sensorId, sizeof(sensorId), "%s-%s", STATION_ID, sensorSuffix);
  o["sensor_id"]  = sensorId;
  o["zone_id"]    = ZONE_ID;
  o["sensor_type"] = type;
  o["value"]      = value;
  o["unit"]       = unit;
}

bool pushReadings(JsonDocument& doc) {
  String body;
  serializeJson(doc, body);

  HTTPClient http;
  char url[128];
  snprintf(url, sizeof(url), "http://%s:%d%s", API_HOST, API_PORT, API_PATH);
  http.begin(url);
  http.setTimeout(10000);
  http.addHeader("Content-Type", "application/json");
  if (strlen(INGEST_TOKEN) > 0) {
    http.addHeader("X-Sensor-Token", INGEST_TOKEN);
  }

  Serial.print("[http] POST ");
  Serial.println(url);
  Serial.println(body);

  int code = http.POST(body);
  String resp = http.getString();
  http.end();

  if (code >= 200 && code < 300) {
    Serial.printf("[http] %d OK: %s\n", code, resp.c_str());
    return true;
  }
  Serial.printf("[http] FAILED code=%d resp=%s\n", code, resp.c_str());
  return false;
}

// -----------------------------------------------------------------------------
// 5. SETUP / LOOP
// -----------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("\n=== LHASA India ESP32 field station ===");
  Serial.printf("station=%s zone=%s interval=%dmin deepSleep=%s\n",
                STATION_ID, ZONE_ID, SEND_INTERVAL_MIN,
                USE_DEEP_SLEEP ? "yes" : "no");

  analogReadResolution(12);
  // 11 dB attenuation covers the full 0–3.3 V ADC range
  analogSetPinAttenuation(PIN_SOIL_MOISTURE, ADC_11db);
#ifdef USE_LM35
  analogSetPinAttenuation(PIN_LM35, ADC_11db);
#endif
#ifdef USE_ACS712
  analogSetPinAttenuation(PIN_ACS712, ADC_11db);
#endif

  dht.begin();
  delay(2500);   // DHT11 needs ~1 s+ after power-up to give a stable first read

  // --- read sensors --------------------------------------------------------
  float soilPct = readSoilMoisturePercent();

  float airTemp = dht.readTemperature();      // °C
  float airHum  = dht.readHumidity();         // %
  bool dhtOk = !isnan(airTemp) && !isnan(airHum);
  if (!dhtOk) Serial.println("[dht] read failed (NaN) — skipping temp/humidity");

#ifdef USE_LM35
  float lm35 = readLm35Celsius();
  Serial.printf("[lm35] %.1f C\n", lm35);
#endif
#ifdef USE_ACS712
  float amps = readMainsCurrentRms();
  Serial.printf("[acs712] %.2f A\n", amps);
#endif

  Serial.printf("[soil] %.1f %%  [dht] %.1f C / %.1f %%\n",
                soilPct, airTemp, airHum);

  // --- push to backend -----------------------------------------------------
  bool pushed = false;
  if (connectWifi()) {
    JsonDocument doc;
    JsonArray readings = doc["readings"].to<JsonArray>();

    // soil moisture is the value the LHASA model actually consumes
    addReading(readings, "SOIL", "soil_moisture", soilPct, "%");
    if (dhtOk) {
      addReading(readings, "TEMP", "temperature", airTemp, "C");
      addReading(readings, "HUM",  "humidity",    airHum,  "%");
    }
#ifdef USE_LM35
    addReading(readings, "LM35", "temperature", lm35, "C");
#endif
#ifdef USE_ACS712
    // power health of the cabinet: 0 A == mains dead (falling back to battery)
    addReading(readings, "PWR", "seismic", amps, "A");  // parked as generic channel
#endif

    pushed = pushReadings(doc);
  }
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);

  // --- sleep ---------------------------------------------------------------
  if (USE_DEEP_SLEEP) {
    uint64_t sleepUs = (uint64_t)SEND_INTERVAL_MIN * 60ULL * 1000000ULL;
    Serial.printf("[power] deep sleep for %d min\n", SEND_INTERVAL_MIN);
    Serial.flush();
    esp_sleep_enable_timer_wakeup(sleepUs);
    esp_deep_sleep_start();
  } else {
    Serial.printf("[power] idle %d min (deep sleep disabled)\n", SEND_INTERVAL_MIN);
    delay((uint32_t)SEND_INTERVAL_MIN * 60UL * 1000UL);
    (void)pushed;
    setup();   // re-run the cycle without deep sleep
  }
}

void loop() {
  // Everything happens in setup(); with deep sleep the chip wakes into setup()
  // again, and without deep sleep setup() re-runs itself.
}
