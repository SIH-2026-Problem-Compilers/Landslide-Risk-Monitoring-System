import { citizenReports } from '../data/mockData';
import type { CitizenReport, ReportFormData } from '../types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let reports = [...citizenReports];

export const reportService = {
  async getReports(): Promise<CitizenReport[]> {
    await delay(300);
    return [...reports];
  },

  async getReportById(id: string): Promise<CitizenReport | undefined> {
    await delay(150);
    return reports.find(r => r.id === id);
  },

  async submitReport(data: ReportFormData): Promise<CitizenReport> {
    await delay(500);
    const newReport: CitizenReport = {
      id: `cr-${String(reports.length + 1).padStart(3, '0')}`,
      reporterName: 'Current User',
      type: data.type,
      district: data.district,
      description: data.description,
      latitude: data.latitude,
      longitude: data.longitude,
      status: 'pending',
      images: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    reports = [newReport, ...reports];
    return newReport;
  },

  async getReportStats(): Promise<{ total: number; pending: number; verified: number; resolved: number }> {
    await delay(150);
    return {
      total: reports.length,
      pending: reports.filter(r => r.status === 'pending').length,
      verified: reports.filter(r => r.status === 'verified').length,
      resolved: reports.filter(r => r.status === 'resolved').length,
    };
  },
};
