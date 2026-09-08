import { predictions, forecasts, aiRecommendations } from '../data/mockData';
import type { Prediction, Forecast, AIRecommendation } from '../types';

// NASA LHASA (the XGBoost model in ../backend/../LHASA) runs server-side in
// Python — never in the browser. This service talks to the FastAPI wrapper:
//
//   GET  /api/v1/ml/predictions   zone-level nowcast from latest LHASA run
//   GET  /api/v1/ml/forecasts     24h/48h/72h forecast from latest LHASA run
//   GET  /api/v1/ml/recommendations  derived alert suggestions
//   POST /api/v1/ml/predict       start a run + return the latest prediction
//
// In development the Vite server proxies /api -> http://127.0.0.1:8000
// (see vite.config.ts). For a deployed frontend set VITE_LHASA_API_URL to the
// API origin, e.g. https://lhasa-api.example.com (no trailing slash).
//
// While the backend is down, unconfigured, or before its first LHASA run has
// completed, every call falls back to the prototype mock data so the UI keeps
// working.

const API_BASE = (import.meta.env.VITE_LHASA_API_URL as string | undefined ?? '').replace(/\/+$/, '');

const REQUEST_TIMEOUT_MS = 2500;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
    if (!response.ok) {
      throw new Error(`LHASA API ${response.status} for ${path}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function withMockFallback<T>(request: () => Promise<T>, mock: T): Promise<T> {
  try {
    return await request();
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[lhasa] API unavailable, using mock data:', err);
    }
    await delay(200);
    return mock;
  }
}

export const mlService = {
  getPredictions(): Promise<Prediction[]> {
    return withMockFallback(
      () => api<Prediction[]>('/api/v1/ml/predictions'),
      predictions,
    );
  },

  getForecasts(): Promise<Forecast[]> {
    return withMockFallback(
      () => api<Forecast[]>('/api/v1/ml/forecasts'),
      forecasts,
    );
  },

  getRecommendations(): Promise<AIRecommendation[]> {
    return withMockFallback(
      () => api<AIRecommendation[]>('/api/v1/ml/recommendations'),
      aiRecommendations,
    );
  },

  /** Starts a LHASA run; returns the latest prediction for the zone. */
  async predict(zoneId: string): Promise<Prediction> {
    const mock = predictions.find(p => p.zoneId === zoneId);
    try {
      const result = await api<{ prediction: Prediction | null }>('/api/v1/ml/predict', {
        method: 'POST',
        body: JSON.stringify({ zoneId }),
      });
      if (result.prediction) return result.prediction;
      if (mock) return mock;
      throw new Error('Zone not found');
    } catch (err) {
      if (mock) {
        if (import.meta.env.DEV) {
          console.warn('[lhasa] predict fell back to mock data:', err);
        }
        return mock;
      }
      throw err;
    }
  },

  // Future API: POST /ml/analyze-image (not part of LHASA — kept as prototype stub)
  async analyzeImage(_imageData: string): Promise<{ riskScore: number; findings: string[] }> {
    await delay(1000);
    return {
      riskScore: 75,
      findings: ['Visible ground cracks detected', 'Vegetation stress indicators', 'Slope angle: 35°'],
    };
  },
};
