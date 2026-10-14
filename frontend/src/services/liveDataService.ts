/**
 * Live data service — roads, historical events, emergency zones.
 *
 * All data comes from the live backend; mock data is the fallback.
 */
import { roads, historicalEvents, emergencyZones } from '../data/mockData';
import type { Road, HistoricalEvent, EmergencyZone } from '../types';
import { apiFetch, withFallback } from './api';

function toRoad(raw: Record<string, unknown>): Road {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    from: String(raw.from ?? ''),
    to: String(raw.to ?? ''),
    district: String(raw.district ?? ''),
    status: raw.status as Road['status'],
    reason: raw.reason ? String(raw.reason) : undefined,
    lastUpdated: String(raw.lastUpdated ?? new Date().toISOString()),
    alternativeRoute: raw.alternativeRoute ? String(raw.alternativeRoute) : undefined,
    coordinates: (raw.coordinates as [number, number][]) ?? [],
  };
}

function toHistoricalEvent(raw: Record<string, unknown>): HistoricalEvent {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    date: String(raw.date ?? ''),
    district: String(raw.district ?? ''),
    state: String(raw.state ?? ''),
    severity: raw.severity as HistoricalEvent['severity'],
    casualties: Number(raw.casualties ?? 0),
    displaced: Number(raw.displaced ?? 0),
    description: String(raw.description ?? ''),
    latitude: Number(raw.latitude ?? 0),
    longitude: Number(raw.longitude ?? 0),
    triggers: Array.isArray(raw.triggers) ? (raw.triggers as string[]) : [],
    areaAffected: Number(raw.areaAffected ?? 0),
  };
}

function toEmergencyZone(raw: Record<string, unknown>): EmergencyZone {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    district: String(raw.district ?? ''),
    populationAtRisk: Number(raw.populationAtRisk ?? 0),
    priorityRank: Number(raw.priorityRank ?? 0),
    severity: raw.severity as EmergencyZone['severity'],
    infrastructureImpact: Array.isArray(raw.infrastructureImpact)
      ? (raw.infrastructureImpact as string[])
      : [],
    hospitals: Number(raw.hospitals ?? 0),
    shelters: Number(raw.shelters ?? 0),
    latitude: Number(raw.latitude ?? 0),
    longitude: Number(raw.longitude ?? 0),
  };
}

export const liveDataService = {
  async getRoads(): Promise<Road[]> {
    return withFallback(
      async () => {
        const raw = await apiFetch<Record<string, unknown>[]>('/api/v1/roads');
        return raw.map(toRoad);
      },
      roads,
      'roads',
    );
  },

  async getHistoricalEvents(params?: {
    state?: string;
    severity?: string;
    year?: string;
  }): Promise<HistoricalEvent[]> {
    return withFallback(
      async () => {
        const qs = new URLSearchParams();
        if (params?.state) qs.set('state', params.state);
        if (params?.severity) qs.set('severity', params.severity);
        if (params?.year) qs.set('year', params.year);
        const path = `/api/v1/historical${qs.toString() ? `?${qs}` : ''}`;
        const raw = await apiFetch<Record<string, unknown>[]>(path);
        return raw.map(toHistoricalEvent);
      },
      historicalEvents,
      'historical',
    );
  },

  async getEmergencyZones(): Promise<EmergencyZone[]> {
    return withFallback(
      async () => {
        const raw = await apiFetch<Record<string, unknown>[]>('/api/v1/emergency/zones');
        return raw.map(toEmergencyZone);
      },
      emergencyZones,
      'emergency/zones',
    );
  },
};
