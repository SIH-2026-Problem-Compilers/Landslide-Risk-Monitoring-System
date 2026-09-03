import { sensors } from '../data/mockData';
import type { Sensor, SensorReading } from '../types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const sensorService = {
  async getSensors(): Promise<Sensor[]> {
    await delay(300);
    return sensors;
  },

  async getSensorById(id: string): Promise<Sensor | undefined> {
    await delay(150);
    return sensors.find(s => s.id === id);
  },

  async getSensorReadings(_sensorId: string, hours: number = 24): Promise<SensorReading[]> {
    await delay(200);
    const now = Date.now();
    const readings: SensorReading[] = [];
    for (let i = hours; i >= 0; i--) {
      readings.push({
        timestamp: new Date(now - i * 3600000).toISOString(),
        value: Math.round((Math.random() * 60 + 30) * 10) / 10,
        unit: 'reading',
      });
    }
    return readings;
  },

  async getOnlineSensorCount(): Promise<number> {
    await delay(100);
    return sensors.filter(s => s.status === 'online').length;
  },
};
