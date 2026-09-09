import { dashboardSummary, riskZones, alerts, riskTrends, districtRiskData, severityDistribution, rainfallVsRisk } from '../data/mockData';
import type { DashboardSummary, RiskZone, Alert, RiskTrend, DistrictRisk, SeverityDistribution } from '../types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const API_BASE = (import.meta.env.VITE_LHASA_API_URL as string | undefined ?? '').replace(/\/+$/, '');
const REQUEST_TIMEOUT_MS = 2500;

async function api<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE}${path}`, { signal: controller.signal });
    if (!response.ok) throw new Error(`API ${response.status} for ${path}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
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
  };
}

export const dashboardService = {
  async getSummary(): Promise<DashboardSummary> {
    await delay(300);
    return dashboardSummary;
  },

  async getRiskZones(): Promise<RiskZone[]> {
    await delay(200);
    return riskZones;
  },

  async getRiskZoneById(id: string): Promise<RiskZone | undefined> {
    await delay(150);
    return riskZones.find(z => z.id === id);
  },

  async getAlerts(): Promise<Alert[]> {
    try {
      const raw = await api<Record<string, unknown>[]>('/api/v1/alerts');
      if (raw.length > 0) return raw.map(toAlert);
      return alerts;
    } catch {
      if (import.meta.env.DEV) console.warn('[alerts] API unavailable, using mock data');
      await delay(200);
      return alerts;
    }
  },

  async getRiskTrends(): Promise<RiskTrend[]> {
    await delay(200);
    return riskTrends;
  },

  async getDistrictRiskData(): Promise<DistrictRisk[]> {
    await delay(200);
    return districtRiskData;
  },

  async getSeverityDistribution(): Promise<SeverityDistribution[]> {
    await delay(150);
    return severityDistribution;
  },

  async getRainfallVsRisk(): Promise<RiskTrend[]> {
    await delay(200);
    return rainfallVsRisk;
  },
};
