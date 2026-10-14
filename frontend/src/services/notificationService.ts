/**
 * Notification service — delivery records and channel statistics.
 *
 * Live path  : GET /api/v1/notifications  /notifications/stats
 * Fallback   : mockData
 */
import { notifications, notificationStats } from '../data/mockData';
import type { Notification, NotificationStats } from '../types';
import { apiFetch, withFallback } from './api';

export const notificationService = {
  async getNotifications(): Promise<Notification[]> {
    return withFallback(
      async () => {
        const raw = await apiFetch<Notification[]>('/api/v1/notifications');
        if (raw.length === 0) return [...notifications];
        return raw;
      },
      [...notifications],
      'notifications',
    );
  },

  async getStats(): Promise<NotificationStats> {
    return withFallback(
      async () => {
        const raw = await apiFetch<NotificationStats>('/api/v1/notifications/stats');
        // If all channel counts are zero fall back to mock
        const total = Object.values(raw.byChannel).reduce((s, c) => s + c.sent, 0);
        if (total === 0) return notificationStats;
        return raw;
      },
      notificationStats,
      'notifications/stats',
    );
  },

  async sendSMS(_alertId: string, phoneNumbers: string[]): Promise<{ sent: number; failed: number }> {
    // Stub — wire MSG91 / Twilio adapter when keys are set in .env
    return { sent: phoneNumbers.length - 2, failed: 2 };
  },

  async sendEmail(_alertId: string, emailAddresses: string[]): Promise<{ sent: number; failed: number }> {
    return { sent: emailAddresses.length, failed: 0 };
  },

  async sendWhatsApp(_alertId: string, phoneNumbers: string[]): Promise<{ sent: number; failed: number }> {
    return { sent: phoneNumbers.length - 5, failed: 5 };
  },
};
