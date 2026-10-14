/**
 * Sensor service — live IoT sensor status and readings.
 *
 * Live path only — NO mock/synthetic fallback (sensor data is never faked):
 *   GET /api/v1/sensors
 *   GET /api/v1/sensors/{id}
 *   GET /api/v1/sensors/{id}/readings?hours=24
 *
 * When the API is unreachable these methods resolve to empty results so the
 * pages can render an honest "no live sensor data" state instead of dummy
 * values. Sensor rows themselves are produced by the backend from live
 * Open-Meteo zone inputs plus any ESP32 stations pushing real readings
 * (see doc/IOT_INTEGRATION.md).
 */
import type { Sensor, SensorReading } from '../types';
import { apiFetch } from './api';

function toSensor(raw: Record<string, unknown>): Sensor {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    type: raw.type as Sensor['type'],
    status: raw.status as Sensor['status'],
    latitude: Number(raw.latitude),
    longitude: Number(raw.longitude),
    district: String(raw.district ?? ''),
    lastReading: Number(raw.lastReading ?? 0),
    unit: String(raw.unit ?? ''),
    lastUpdated: String(raw.lastUpdated ?? new Date().toISOString()),
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

  async getOnlineSensorCount(): Promise<number> {
    const all = await this.getSensors();
    return all.filter(s => s.status === 'online').length;
  },
};
