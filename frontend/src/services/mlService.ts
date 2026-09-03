import { predictions, forecasts, aiRecommendations } from '../data/mockData';
import type { Prediction, Forecast, AIRecommendation } from '../types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mlService = {
  async getPredictions(): Promise<Prediction[]> {
    await delay(400);
    return predictions;
  },

  async getForecasts(): Promise<Forecast[]> {
    await delay(300);
    return forecasts;
  },

  async getRecommendations(): Promise<AIRecommendation[]> {
    await delay(250);
    return aiRecommendations;
  },

  // Future API: POST /ml/predict
  async predict(zoneId: string): Promise<Prediction> {
    await delay(500);
    const pred = predictions.find(p => p.zoneId === zoneId);
    if (!pred) throw new Error('Zone not found');
    return pred;
  },

  // Future API: POST /ml/analyze-image
  async analyzeImage(_imageData: string): Promise<{ riskScore: number; findings: string[] }> {
    await delay(1000);
    return {
      riskScore: 75,
      findings: ['Visible ground cracks detected', 'Vegetation stress indicators', 'Slope angle: 35°'],
    };
  },
};
