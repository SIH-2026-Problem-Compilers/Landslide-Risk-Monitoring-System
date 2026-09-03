import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Polyline, Popup } from 'react-leaflet';
import { dashboardService } from '../services';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/SeverityBadge';
import { SkeletonCard } from '../components/ui/LoadingSkeleton';
import { Route, MapPin, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import type { RoadStatus } from '../types';
import 'leaflet/dist/leaflet.css';

const statusFilters: { value: RoadStatus | 'all'; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'all', label: 'All Roads', icon: Route, color: 'text-gray-600' },
  { value: 'open', label: 'Open', icon: CheckCircle, color: 'text-green-600' },
  { value: 'partially_blocked', label: 'Partially Blocked', icon: AlertTriangle, color: 'text-yellow-600' },
  { value: 'fully_blocked', label: 'Fully Blocked', icon: XCircle, color: 'text-red-600' },
];

const statusColors: Record<string, string> = {
  open: '#22c55e',
  partially_blocked: '#eab308',
  fully_blocked: '#ef4444',
};

export function RoadsPage() {
  const { data: roads, isLoading } = useQuery({
    queryKey: ['roads'],
    queryFn: () => dashboardService.getRiskZones().then(() => import('../data/mockData').then(m => m.roads)),
  });

  const [filter, setFilter] = useState<RoadStatus | 'all'>('all');

  const filteredRoads = roads?.filter((r) => filter === 'all' || r.status === filter);

  const stats = {
    open: roads?.filter((r) => r.status === 'open').length || 0,
    partially: roads?.filter((r) => r.status === 'partially_blocked').length || 0,
    fully: roads?.filter((r) => r.status === 'fully_blocked').length || 0,
  };

  return (
    <div>
      <PageHeader
        title="Road Connectivity Monitoring"
        subtitle="Track road conditions and accessibility across districts"
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[
          { label: 'Open Roads', value: stats.open, color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle },
          { label: 'Partially Blocked', value: stats.partially, color: 'text-yellow-600', bg: 'bg-yellow-50', icon: AlertTriangle },
          { label: 'Fully Blocked', value: stats.fully, color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.bg} rounded-xl border border-gray-200 p-4`}>
            <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-sm text-gray-600">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {statusFilters.map((sf) => (
          <button
            key={sf.value}
            onClick={() => setFilter(sf.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full flex items-center gap-1 transition-colors ${
              filter === sf.value
                ? 'bg-aztec text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <sf.icon className={`w-3 h-3 ${filter === sf.value ? 'text-white' : sf.color}`} />
            {sf.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Map */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ height: '500px' }}>
          <MapContainer
            center={[27.7, 85.5]}
            zoom={8}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {filteredRoads?.map((road) => (
              <Polyline
                key={road.id}
                positions={road.coordinates}
                pathOptions={{
                  color: statusColors[road.status],
                  weight: 4,
                  opacity: 0.8,
                }}
              >
                <Popup>
                  <div className="min-w-[200px]">
                    <h4 className="font-semibold text-sm">{road.name}</h4>
                    <p className="text-xs text-gray-500">{road.from} → {road.to}</p>
                    <p className="text-xs mt-1">Status: <strong>{road.status.replace(/_/g, ' ')}</strong></p>
                    {road.reason && <p className="text-xs text-gray-500 mt-1">Reason: {road.reason}</p>}
                    {road.alternativeRoute && <p className="text-xs text-blue-600 mt-1">Alternative: {road.alternativeRoute}</p>}
                  </div>
                </Popup>
              </Polyline>
            ))}
          </MapContainer>
        </div>

        {/* Road Cards */}
        <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-thin">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : filteredRoads?.map((road) => (
                <div key={road.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-800">{road.name}</h4>
                      <p className="text-xs text-gray-500">{road.from} → {road.to}</p>
                    </div>
                    <StatusBadge status={road.status} />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {road.district}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(road.lastUpdated).toLocaleString()}
                    </span>
                  </div>
                  {road.reason && (
                    <div className="mt-2 p-2 bg-yellow-50 rounded-lg text-xs text-yellow-700">
                      {road.reason}
                    </div>
                  )}
                  {road.alternativeRoute && (
                    <div className="mt-2 p-2 bg-blue-50 rounded-lg text-xs text-blue-700">
                      🔄 {road.alternativeRoute}
                    </div>
                  )}
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}
