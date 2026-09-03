import { dashboardSummary, riskZones, alerts, riskTrends, districtRiskData, severityDistribution, rainfallVsRisk } from '../data/mockData';
import type { DashboardSummary, RiskZone, Alert, RiskTrend, DistrictRisk, SeverityDistribution } from '../types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
    await delay(250);
    return alerts;
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
