import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services';
import { PageHeader } from '../components/ui/PageHeader';
import { SeverityBadge, StatusBadge } from '../components/ui/SeverityBadge';
import { SkeletonTable } from '../components/ui/LoadingSkeleton';
import { EmptyState } from '../components/ui/EmptyState';
import {
  Bell, Filter, Eye, Edit, Archive, Clock, MapPin,
} from 'lucide-react';
import type { AlertSeverity, AlertStatus } from '../types';

const severityFilters: { value: AlertSeverity | 'all'; label: string }[] = [
  { value: 'all', label: 'All Severity' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'critical', label: 'Critical' },
  { value: 'warning', label: 'Warning' },
  { value: 'info', label: 'Info' },
];

const statusFilters: { value: AlertStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'archived', label: 'Archived' },
];

export function AlertsPage() {
  const { data: alerts, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: dashboardService.getAlerts,
  });

  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'all'>('all');
  const [selectedAlert] = useState<string | null>(null);

  const filteredAlerts = alerts?.filter(
    (a) =>
      (severityFilter === 'all' || a.severity === severityFilter) &&
      (statusFilter === 'all' || a.status === statusFilter)
  );

  return (
    <div>
      <PageHeader
        title="Alert Management"
        subtitle="Monitor and manage all system alerts and warnings"
        actions={
          <button className="px-4 py-2 bg-aztec text-white text-sm font-medium rounded-lg flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Create Alert
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Emergency', value: alerts?.filter(a => a.severity === 'emergency').length || 0, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Critical', value: alerts?.filter(a => a.severity === 'critical').length || 0, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Warning', value: alerts?.filter(a => a.severity === 'warning').length || 0, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Info', value: alerts?.filter(a => a.severity === 'info').length || 0, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.bg} rounded-lg border border-gray-200 p-3`}>
            <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-600">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-500">Severity:</span>
        </div>
        {severityFilters.map((sf) => (
          <button
            key={sf.value}
            onClick={() => setSeverityFilter(sf.value)}
            className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
              severityFilter === sf.value
                ? 'bg-aztec text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {sf.label}
          </button>
        ))}
        <div className="w-px h-4 bg-gray-200 mx-1" />
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">Status:</span>
        </div>
        {statusFilters.map((sf) => (
          <button
            key={sf.value}
            onClick={() => setStatusFilter(sf.value)}
            className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
              statusFilter === sf.value
                ? 'bg-aztec text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {sf.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <SkeletonTable rows={6} />
      ) : !filteredAlerts?.length ? (
        <EmptyState
          icon={Bell}
          title="No alerts found"
          description="No alerts match the current filter criteria."
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Alert</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Severity</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">District</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Source</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Time</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredAlerts.map((alert) => (
                  <tr
                    key={alert.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      selectedAlert === alert.id ? 'bg-capri/5' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{alert.title}</p>
                      <p className="text-xs text-gray-500 truncate max-w-xs">{alert.message}</p>
                    </td>
                    <td className="px-4 py-3">
                      <SeverityBadge severity={alert.severity} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-gray-600">
                        <MapPin className="w-3 h-3" />
                        {alert.district}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{alert.source}</td>
                    <td className="px-4 py-3"><StatusBadge status={alert.status} /></td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(alert.createdAt).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-aztec transition-colors" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-amber-500 transition-colors" title="Edit">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors" title="Archive">
                          <Archive className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
