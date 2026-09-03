import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { reportService } from '../services';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/SeverityBadge';
import { SkeletonTable } from '../components/ui/LoadingSkeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { FileText, Plus, Filter, X, ChevronRight, MapPin, Clock, User } from 'lucide-react';
import type { CitizenReport, IncidentType } from '../types';

const typeFilters: { value: IncidentType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'crack', label: 'Crack' },
  { value: 'road_blockage', label: 'Road Blockage' },
  { value: 'rockfall', label: 'Rockfall' },
  { value: 'flooding', label: 'Flooding' },
  { value: 'slope_movement', label: 'Slope Movement' },
  { value: 'landslide', label: 'Landslide' },
];

export function ReportsPage() {
  const { data: reports, isLoading } = useQuery({
    queryKey: ['citizen-reports'],
    queryFn: reportService.getReports,
  });

  const [typeFilter, setTypeFilter] = useState<IncidentType | 'all'>('all');
  const [selectedReport, setSelectedReport] = useState<CitizenReport | null>(null);
  const navigate = useNavigate();

  const filteredReports = reports?.filter(
    (r) => typeFilter === 'all' || r.type === typeFilter
  );

  return (
    <div>
      <PageHeader
        title="Citizen Reports"
        subtitle="Community-submitted incident reports and field observations"
        actions={
          <button
            onClick={() => navigate('/reports/submit')}
            className="px-4 py-2 bg-aztec text-white text-sm font-medium rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Submit Report
          </button>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Filter className="w-4 h-4 text-gray-400" />
        {typeFilters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setTypeFilter(filter.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              typeFilter === filter.value
                ? 'bg-aztec text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total', value: reports?.length || 0, color: 'text-gray-800' },
          { label: 'Pending', value: reports?.filter(r => r.status === 'pending').length || 0, color: 'text-yellow-600' },
          { label: 'Verified', value: reports?.filter(r => r.status === 'verified').length || 0, color: 'text-blue-600' },
          { label: 'Resolved', value: reports?.filter(r => r.status === 'resolved').length || 0, color: 'text-green-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-500">{stat.label}</p>
            <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Table */}
        <div className="lg:col-span-2">
          {isLoading ? (
            <SkeletonTable rows={5} />
          ) : !filteredReports?.length ? (
            <EmptyState
              icon={FileText}
              title="No reports found"
              description="No citizen reports match the current filter criteria."
            />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Reporter</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">District</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Time</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredReports.map((report) => (
                      <tr
                        key={report.id}
                        onClick={() => setSelectedReport(report)}
                        className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                          selectedReport?.id === report.id ? 'bg-capri/5' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-aztec/10 rounded-full flex items-center justify-center">
                              <User className="w-3.5 h-3.5 text-aztec" />
                            </div>
                            <span className="font-medium text-gray-800">{report.reporterName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600 capitalize">
                            {report.type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{report.district}</td>
                        <td className="px-4 py-3"><StatusBadge status={report.status} /></td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 h-fit sticky top-20">
          {selectedReport ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-800">Report Details</h3>
                <button onClick={() => setSelectedReport(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{selectedReport.reporterName}</p>
                    <p className="text-xs text-gray-500">{selectedReport.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-800 capitalize">{selectedReport.type.replace(/_/g, ' ')}</p>
                    <StatusBadge status={selectedReport.status} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{selectedReport.district}</p>
                    <p className="text-xs text-gray-500">{selectedReport.latitude.toFixed(4)}, {selectedReport.longitude.toFixed(4)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <p className="text-sm text-gray-600">{new Date(selectedReport.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">Description</p>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedReport.description}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Select a report to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
