import { notifications, notificationStats } from '../data/mockData';
import type { Notification, NotificationStats } from '../types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const notificationService = {
  async getNotifications(): Promise<Notification[]> {
    await delay(300);
    return [...notifications];
  },

  async getStats(): Promise<NotificationStats> {
    await delay(200);
    return notificationStats;
  },

  // Future APIs
  async sendSMS(_alertId: string, phoneNumbers: string[]): Promise<{ sent: number; failed: number }> {
    await delay(500);
    return { sent: phoneNumbers.length - 2, failed: 2 };
  },

  async sendEmail(_alertId: string, emailAddresses: string[]): Promise<{ sent: number; failed: number }> {
    await delay(500);
    return { sent: emailAddresses.length, failed: 0 };
  },

  async sendWhatsApp(_alertId: string, phoneNumbers: string[]): Promise<{ sent: number; failed: number }> {
    await delay(500);
    return { sent: phoneNumbers.length - 5, failed: 5 };
  },
};
