import { useQuery } from '@tanstack/react-query';
import { notificationService } from '../services';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/SeverityBadge';
import { SkeletonCard } from '../components/ui/LoadingSkeleton';
import {
  Bell, MessageSquare, Mail, Phone, Radio, CheckCircle, XCircle, Send,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const channelIcons: Record<string, typeof MessageSquare> = {
  sms: MessageSquare,
  email: Mail,
  whatsapp: Phone,
  ivr: Radio,
};

const channelColors: Record<string, string> = {
  sms: 'bg-blue-50 text-blue-600',
  email: 'bg-purple-50 text-purple-600',
  whatsapp: 'bg-green-50 text-green-600',
  ivr: 'bg-amber-50 text-amber-600',
};

export function NotificationsPage() {
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationService.getNotifications,
  });

  const { data: stats } = useQuery({
    queryKey: ['notification-stats'],
    queryFn: notificationService.getStats,
  });

  const channelData = stats
    ? Object.entries(stats.byChannel).map(([channel, data]) => ({
        channel: channel.toUpperCase(),
        sent: data.sent,
        delivered: data.delivered,
        failed: data.failed,
      }))
    : [];

  return (
    <div>
      <PageHeader
        title="Notification Center"
        subtitle="Track and manage multi-channel alert delivery"
        actions={
          <button className="px-4 py-2 bg-aztec text-white text-sm font-medium rounded-lg flex items-center gap-2">
            <Send className="w-4 h-4" />
            Send Alert
          </button>
        }
      />

      {/* Channel Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : stats && Object.entries(stats.byChannel).map(([channel, data]) => {
              const Icon = channelIcons[channel] || Bell;
              const deliveryRate = data.sent > 0 ? ((data.delivered / data.sent) * 100).toFixed(1) : '0';
              return (
                <div key={channel} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-lg ${channelColors[channel]}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-gray-500">{channel.toUpperCase()}</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{data.sent.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mb-2">messages sent</p>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="w-3 h-3" />
                      {deliveryRate}%
                    </span>
                    <span className="flex items-center gap-1 text-red-500">
                      <XCircle className="w-3 h-3" />
                      {data.failed}
                    </span>
                  </div>
                </div>
              );
            })}
      </div>

      {/* Summary Cards */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-aztec rounded-xl p-5 text-white">
            <p className="text-sm text-white/70">Total Sent</p>
            <p className="text-3xl font-bold mt-1">{stats.totalSent.toLocaleString()}</p>
          </div>
          <div className="bg-green-600 rounded-xl p-5 text-white">
            <p className="text-sm text-white/70">Delivered</p>
            <p className="text-3xl font-bold mt-1">{stats.totalDelivered.toLocaleString()}</p>
          </div>
          <div className="bg-red-500 rounded-xl p-5 text-white">
            <p className="text-sm text-white/70">Failed</p>
            <p className="text-3xl font-bold mt-1">{stats.totalFailed.toLocaleString()}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Delivery Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Delivery by Channel</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={channelData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="channel" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Legend />
              <Bar dataKey="delivered" fill="#22c55e" name="Delivered" />
              <Bar dataKey="failed" fill="#ef4444" name="Failed" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Notifications */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Recent Notifications</h3>
          <div className="space-y-3 max-h-[260px] overflow-y-auto scrollbar-thin">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse p-3 bg-gray-50 rounded-lg">
                    <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-2 bg-gray-100 rounded w-1/2" />
                  </div>
                ))
              : notifications?.map((notif) => {
                  const Icon = channelIcons[notif.channel] || Bell;
                  return (
                    <div key={notif.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${channelColors[notif.channel]}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{notif.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{notif.message}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                            <span>{notif.recipients.toLocaleString()} recipients</span>
                            <span>•</span>
                            <span>{new Date(notif.sentAt).toLocaleString()}</span>
                          </div>
                        </div>
                        <StatusBadge status={notif.status} />
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>
      </div>
    </div>
  );
}
