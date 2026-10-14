/**
 * ML service — LHASA predictions, forecasts, recommendations.
 *
 * Live path  : GET /api/v1/ml/predictions  /ml/forecasts  /ml/recommendations
 *              POST /api/v1/ml/predict
 * Fallback   : mockData
 *
 * The LHASA model runs server-side (Python XGBoost). The server scores the
 * real model.json with live Open-Meteo inputs for each India zone on startup
 * and on every /weather/refresh call so predictions are always fresh.
 */
import { predictions, forecasts, aiRecommendations } from '../data/mockData';
import type { Prediction, Forecast, AIRecommendation } from '../types';
import { apiFetch, withFallback } from './api';

export const mlService = {
  getPredictions(): Promise<Prediction[]> {
    return withFallback(
      () => apiFetch<Prediction[]>('/api/v1/ml/predictions'),
      predictions,
      'ml/predictions',
    );
  },

  getForecasts(): Promise<Forecast[]> {
    return withFallback(
      () => apiFetch<Forecast[]>('/api/v1/ml/forecasts'),
      forecasts,
      'ml/forecasts',
    );
  },

  getRecommendations(): Promise<AIRecommendation[]> {
    return withFallback(
      () => apiFetch<AIRecommendation[]>('/api/v1/ml/recommendations'),
      aiRecommendations,
      'ml/recommendations',
    );
  },

  async predict(zoneId: string): Promise<Prediction> {
    const mock = predictions.find(p => p.zoneId === zoneId);
    try {
      const result = await apiFetch<{ prediction: Prediction | null }>(
        '/api/v1/ml/predict',
        { method: 'POST', body: JSON.stringify({ zoneId }) },
      );
      if (result.prediction) return result.prediction;
      if (mock) return mock;
      throw new Error('Zone not found');
    } catch (err) {
      if (mock) {
        if (import.meta.env.DEV) console.warn('[lhasa] predict fell back to mock:', err);
        return mock;
      }
      throw err;
    }
  },

  /** Trigger an Open-Meteo weather refresh so the next prediction uses fresh inputs. */
  async refreshWeather(): Promise<{ updated: number }> {
    return withFallback(
      () => apiFetch<{ updated: number }>('/api/v1/weather/refresh', { method: 'POST' }),
      { updated: 0 },
      'weather/refresh',
    );
  },

  // Prototype stub — image analysis not part of LHASA
  async analyzeImage(_imageData: string): Promise<{ riskScore: number; findings: string[] }> {
    return {
      riskScore: 75,
      findings: ['Visible ground cracks detected', 'Vegetation stress indicators', 'Slope angle: 35°'],
    };
  },
};
