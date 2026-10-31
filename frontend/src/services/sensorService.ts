/**
 * Sensor service — live IoT sensor status and readings.
 *
 * Live path only — NO mock/synthetic fallback (sensor data is never faked):
 *   GET  /api/v1/sensors
 *   GET  /api/v1/sensors/{id}
 *   GET  /api/v1/sensors/{id}/readings?hours=24
 *   POST /api/v1/sensors/ingest        station telemetry (USB serial bridge)
 *   POST /api/v1/sensors/heartbeat     laptop GPS / station liveness
 *
 * When the API is unreachable these methods resolve to empty results so the
 * pages can render an honest "no live sensor data" state instead of dummy
 * values. Rows are produced by real stations pushing readings (ESP32 over
 * Wi-Fi or a USB-serial bridge in the browser). Laptop GPS is used as the
 * position fallback for stations that have no GPS module.
 */
import type {
  LaptopLocation,
  Sensor,
  SensorHeartbeatResult,
  SensorLocationSource,
  SensorReading,
  StationReadingInput,
  StationTelemetryInput,
} from '../types';
import { apiFetch } from './api';

// Only needed when the backend enforces SENSOR_INGEST_TOKEN. Since this is a
// localhost demo the default (no token) needs no configuration.
const SENSOR_TOKEN = (import.meta.env.VITE_SENSOR_TOKEN as string | undefined) ?? '';

function ingestHeaders(): Record<string, string> | undefined {
  return SENSOR_TOKEN ? { 'X-Sensor-Token': SENSOR_TOKEN } : undefined;
}

function toSensor(raw: Record<string, unknown>): Sensor {
  return {
    id: String(raw.id ?? ''),
    stationId: String(raw.stationId ?? raw.id ?? ''),
    name: String(raw.name ?? ''),
    type: raw.type as Sensor['type'],
    status: raw.status as Sensor['status'],
    latitude: raw.latitude == null ? null : Number(raw.latitude),
    longitude: raw.longitude == null ? null : Number(raw.longitude),
    district: String(raw.district ?? ''),
    state: raw.state ? String(raw.state) : undefined,
    zoneId: raw.zoneId ? String(raw.zoneId) : undefined,
    lastReading: Number(raw.lastReading ?? 0),
    unit: String(raw.unit ?? ''),
    lastUpdated: String(raw.lastUpdated ?? new Date().toISOString()),
    ageSeconds: raw.ageSeconds == null ? null : Number(raw.ageSeconds),
    locationSource: (raw.locationSource as SensorLocationSource) ?? 'unknown',
    locationAccuracyM:
      raw.locationAccuracyM == null ? null : Number(raw.locationAccuracyM),
    isLocal: Boolean(raw.isLocal),
    // Only show battery telemetry that actually exists — never a placeholder.
    batteryLevel: raw.batteryLevel == null ? undefined : Number(raw.batteryLevel),
  };
}

function toReading(raw: Record<string, unknown>): SensorReading {
  return {
    timestamp: String(raw.timestamp ?? new Date().toISOString()),
    value: Number(raw.value ?? 0),
    unit: String(raw.unit ?? ''),
  };
}

export interface HeartbeatPosition {
  latitude: number;
  longitude: number;
  accuracyM?: number;
  source?: SensorLocationSource;
  stationId?: string;
  stationName?: string;
  batteryLevel?: number;
}

export const sensorService = {
  async getSensors(): Promise<Sensor[]> {
    try {
      const raw = await apiFetch<Record<string, unknown>[]>('/api/v1/sensors');
      return raw.map(toSensor);
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[sensors] API unreachable:', err);
      return [];
    }
  },

  async getSensorById(id: string): Promise<Sensor | undefined> {
    try {
      const raw = await apiFetch<Record<string, unknown>>(`/api/v1/sensors/${id}`);
      return toSensor(raw);
    } catch (err) {
      if (import.meta.env.DEV) console.warn(`[sensors] ${id} unreachable:`, err);
      return undefined;
    }
  },

  /** Last laptop GPS fix known to the backend (fallback for GPS-less stations). */
  async getLaptopLocation(): Promise<LaptopLocation> {
    try {
      return await apiFetch<LaptopLocation>('/api/v1/sensors/location');
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[sensors] laptop location unreachable:', err);
      return { active: false };
    }
  },

  async getSensorReadings(sensorId: string, hours = 24): Promise<SensorReading[]> {
    try {
      const raw = await apiFetch<Record<string, unknown>[]>(
        `/api/v1/sensors/${sensorId}/readings?hours=${hours}`,
      );
      return raw.map(toReading);
    } catch (err) {
      if (import.meta.env.DEV) console.warn(`[sensors] ${sensorId} readings unreachable:`, err);
      return [];
    }
  },

  /**
   * Report the laptop GPS position. Without a station id this only primes the
   * backend fallback used by GPS-less stations in the same zone.
   */
  async sendHeartbeat(position: HeartbeatPosition): Promise<SensorHeartbeatResult | null> {
    try {
      return await apiFetch<SensorHeartbeatResult>('/api/v1/sensors/heartbeat', {
        method: 'POST',
        headers: ingestHeaders(),
        body: JSON.stringify({
          station_id: position.stationId,
          name: position.stationName,
          latitude: position.latitude,
          longitude: position.longitude,
          location_source: position.source ?? 'laptop_gps',
          location_accuracy_m: position.accuracyM,
          battery_level: position.batteryLevel,
        }),
      });
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[sensors] heartbeat failed:', err);
      return null;
    }
  },

  /** Push one real reading batch from a locally connected station. */
  async ingestTelemetry(
    station: StationTelemetryInput,
    readings: StationReadingInput[],
  ): Promise<boolean> {
    try {
      await apiFetch('/api/v1/sensors/ingest', {
        method: 'POST',
        headers: ingestHeaders(),
        body: JSON.stringify({ station, readings }),
      });
      return true;
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[sensors] telemetry push failed:', err);
      return false;
    }
  },
};
