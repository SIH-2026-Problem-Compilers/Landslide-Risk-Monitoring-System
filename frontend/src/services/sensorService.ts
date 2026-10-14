/**
 * Sensor service — live IoT sensor status and readings.
 *
 * Live path  : GET /api/v1/sensors  and  GET /api/v1/sensors/{id}/readings
 * Fallback   : mockData sensors + synthetic time-series
 */
import { sensors } from '../data/mockData';
import type { Sensor, SensorReading } from '../types';
import { apiFetch, withFallback } from './api';

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
    batteryLevel: Number(raw.batteryLevel ?? 80),
  };
}

function toReading(raw: Record<string, unknown>): SensorReading {
  return {
    timestamp: String(raw.timestamp ?? new Date().toISOString()),
    value: Number(raw.value ?? 0),
    unit: String(raw.unit ?? ''),
  };
}

/** Generate synthetic time-series when API is down (for chart rendering). */
function syntheticReadings(hours: number): SensorReading[] {
  const now = Date.now();
  return Array.from({ length: hours + 1 }, (_, i) => ({
    timestamp: new Date(now - (hours - i) * 3_600_000).toISOString(),
    value: Math.round((Math.random() * 40 + 20) * 10) / 10,
    unit: 'reading',
  }));
}

export const sensorService = {
  async getSensors(): Promise<Sensor[]> {
    return withFallback(
      async () => {
        const raw = await apiFetch<Record<string, unknown>[]>('/api/v1/sensors');
        return raw.map(toSensor);
      },
      sensors,
      'sensors',
    );
  },

  async getSensorById(id: string): Promise<Sensor | undefined> {
    return withFallback(
      async () => {
        const raw = await apiFetch<Record<string, unknown>>(`/api/v1/sensors/${id}`);
        return toSensor(raw);
      },
      sensors.find(s => s.id === id),
      `sensors/${id}`,
    );
  },

  async getSensorReadings(sensorId: string, hours = 24): Promise<SensorReading[]> {
    return withFallback(
      async () => {
        const raw = await apiFetch<Record<string, unknown>[]>(
          `/api/v1/sensors/${sensorId}/readings?hours=${hours}`,
        );
        if (raw.length === 0) return syntheticReadings(hours);
        return raw.map(toReading);
      },
      syntheticReadings(hours),
      `sensors/${sensorId}/readings`,
    );
  },

  async getOnlineSensorCount(): Promise<number> {
    const all = await this.getSensors();
    return all.filter(s => s.status === 'online').length;
  },
};
