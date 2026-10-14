/**
 * Dashboard service — all stat cards, risk zones, alerts, charts.
 *
 * Every method tries the live backend first and falls back to mock data
 * when the API is unreachable so the UI always renders something.
 */
import {
  dashboardSummary,
  riskZones,
  alerts,
  riskTrends,
  districtRiskData,
  severityDistribution,
  rainfallVsRisk,
} from '../data/mockData';
import type {
  DashboardSummary,
  RiskZone,
  Alert,
  RiskTrend,
  DistrictRisk,
  SeverityDistribution,
} from '../types';
import { apiFetch, withFallback } from './api';

function toRiskZone(raw: Record<string, unknown>): RiskZone {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    district: String(raw.district ?? ''),
    state: String(raw.state ?? ''),
    latitude: Number(raw.latitude),
    longitude: Number(raw.longitude),
    riskScore: Number(raw.riskScore ?? 0),
    severity: raw.severity as RiskZone['severity'],
    lastUpdated: String(raw.lastUpdated ?? new Date().toISOString()),
    population: raw.population ? Number(raw.population) : undefined,
    description: raw.description ? String(raw.description) : undefined,
    factors: Array.isArray(raw.factors) ? (raw.factors as string[]) : [],
  };
}

function toAlert(raw: Record<string, unknown>): Alert {
  return {
    id: String(raw.id ?? ''),
    title: String(raw.title ?? ''),
    message: String(raw.message ?? ''),
    severity: raw.severity as Alert['severity'],
    district: String(raw.district ?? ''),
    status: raw.status as Alert['status'],
    source: String(raw.source ?? ''),
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
    translations: raw.translations as Alert['translations'],
  };
}

export const dashboardService = {
  async getSummary(): Promise<DashboardSummary> {
    return withFallback(
      () => apiFetch<DashboardSummary>('/api/v1/dashboard/summary'),
      dashboardSummary,
      'dashboard/summary',
    );
  },

  async getRiskZones(): Promise<RiskZone[]> {
    return withFallback(
      async () => {
        const raw = await apiFetch<Record<string, unknown>[]>('/api/v1/zones');
        return raw.map(toRiskZone);
      },
      riskZones,
      'zones',
    );
  },

  async getRiskZoneById(id: string): Promise<RiskZone | undefined> {
    return withFallback(
      async () => {
        const raw = await apiFetch<Record<string, unknown>>(`/api/v1/zones/${id}`);
        return toRiskZone(raw);
      },
      riskZones.find(z => z.id === id),
      `zones/${id}`,
    );
  },

  async getAlerts(): Promise<Alert[]> {
    return withFallback(
      async () => {
        const raw = await apiFetch<Record<string, unknown>[]>('/api/v1/alerts');
        if (raw.length === 0) return alerts;
        return raw.map(toAlert);
      },
      alerts,
      'alerts',
    );
  },

  async getRiskTrends(): Promise<RiskTrend[]> {
    return withFallback(
      () => apiFetch<RiskTrend[]>('/api/v1/dashboard/trends'),
      riskTrends,
      'dashboard/trends',
    );
  },

  async getDistrictRiskData(): Promise<DistrictRisk[]> {
    return withFallback(
      () => apiFetch<DistrictRisk[]>('/api/v1/dashboard/district-risk'),
      districtRiskData,
      'dashboard/district-risk',
    );
  },

  async getSeverityDistribution(): Promise<SeverityDistribution[]> {
    return withFallback(
      () => apiFetch<SeverityDistribution[]>('/api/v1/dashboard/severity'),
      severityDistribution,
      'dashboard/severity',
    );
  },

  async getRainfallVsRisk(): Promise<RiskTrend[]> {
    return withFallback(
      () => apiFetch<RiskTrend[]>('/api/v1/dashboard/rainfall-risk'),
      rainfallVsRisk,
      'dashboard/rainfall-risk',
    );
  },
};
