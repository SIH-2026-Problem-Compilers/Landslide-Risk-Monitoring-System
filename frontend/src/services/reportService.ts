import { citizenReports } from '../data/mockData';
import type { CitizenReport, ReportFormData } from '../types';
import { enqueueReport, flushQueue, getQueueCount } from '../utils/offlineQueue';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const API_BASE = (import.meta.env.VITE_LHASA_API_URL as string | undefined ?? '').replace(/\/+$/, '');
const REQUEST_TIMEOUT_MS = 2500;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
    if (!response.ok) throw new Error(`API ${response.status} for ${path}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

function toReport(raw: Record<string, unknown>): CitizenReport {
  return {
    id: String(raw.id ?? ''),
    reporterName: String(raw.reporterName ?? ''),
    reporterPhone: raw.reporterPhone ? String(raw.reporterPhone) : undefined,
    type: raw.type as CitizenReport['type'],
    district: String(raw.district ?? ''),
    description: String(raw.description ?? ''),
    latitude: Number(raw.latitude),
    longitude: Number(raw.longitude),
    status: raw.status as CitizenReport['status'],
    images: Array.isArray(raw.images) ? (raw.images as string[]) : [],
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
  };
}

let reports = [...citizenReports];

export const reportService = {
  async getReports(): Promise<CitizenReport[]> {
    try {
      const raw = await api<Record<string, unknown>[]>('/api/v1/reports');
      if (raw.length > 0) {
        reports = raw.map(toReport);
      }
      return [...reports];
    } catch {
      await delay(200);
      return [...reports];
    }
  },

  async getReportById(id: string): Promise<CitizenReport | undefined> {
    const list = await this.getReports();
    return list.find(r => r.id === id);
  },

  async submitReport(data: ReportFormData): Promise<CitizenReport> {
    const body = {
      reporterName: 'Current User',
      type: data.type,
      district: data.district,
      description: data.description,
      latitude: data.latitude,
      longitude: data.longitude,
      mediaUrls: data.images.map(f => f.name),
    };

    // Online: POST directly. Offline: queue for later.
    if (navigator.onLine) {
      try {
        const saved = await api<Record<string, unknown>>('/api/v1/reports', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        const report = toReport(saved);
        reports = [report, ...reports];
        return report;
      } catch {
        // Fall through to queue on API failure too
      }
    }

    // Offline or API failed — queue
    await enqueueReport({
      reporterName: body.reporterName,
      type: body.type,
      district: body.district,
      description: body.description,
      latitude: body.latitude,
      longitude: body.longitude,
      mediaUrls: body.mediaUrls,
    });

    // Return a local pending report
    const localReport: CitizenReport = {
      id: `q-${Date.now()}`,
      reporterName: 'Current User',
      type: data.type,
      district: data.district,
      description: `[Queued] ${data.description}`,
      latitude: data.latitude,
      longitude: data.longitude,
      status: 'pending',
      images: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    reports = [localReport, ...reports];
    return localReport;
  },

  async flushOfflineQueue(): Promise<{ sent: number; failed: number }> {
    return flushQueue(async (report) => {
      await api('/api/v1/reports', {
        method: 'POST',
        body: JSON.stringify({
          reporterName: report.reporterName,
          type: report.type,
          district: report.district,
          description: report.description,
          latitude: report.latitude,
          longitude: report.longitude,
          mediaUrls: report.mediaUrls,
        }),
      });
    });
  },

  async getOfflineQueueCount(): Promise<number> {
    try {
      return await getQueueCount();
    } catch {
      return 0;
    }
  },

  async getReportStats(): Promise<{ total: number; pending: number; verified: number; resolved: number }> {
    const all = await this.getReports();
    const queued = await this.getOfflineQueueCount();
    return {
      total: all.length + queued,
      pending: all.filter(r => r.status === 'pending').length + queued,
      verified: all.filter(r => r.status === 'verified').length,
      resolved: all.filter(r => r.status === 'resolved').length,
    };
  },
};
