import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { dashboardService } from '../services';
import { PageHeader } from '../components/ui/PageHeader';
import { SeverityBadge } from '../components/ui/SeverityBadge';

import {
  Siren, Users, Building, Heart, ShieldAlert,
  AlertTriangle,
} from 'lucide-react';
import { emergencyZones } from '../data/mockData';
import 'leaflet/dist/leaflet.css';

const severityColors: Record<string, string> = {
  low: '#22c55e',
  moderate: '#eab308',
  high: '#f97316',
  severe: '#ef4444',
};

export function EmergencyPage() {
  const { data: _riskZones } = useQuery({
    queryKey: ['risk-zones'],
    queryFn: dashboardService.getRiskZones,
  });

  const totalPopAtRisk = emergencyZones.reduce((sum, z) => sum + z.populationAtRisk, 0);
  const totalHospitals = emergencyZones.reduce((sum, z) => sum + z.hospitals, 0);
  const totalShelters = emergencyZones.reduce((sum, z) => sum + z.shelters, 0);

  return (
    <div>
      <PageHeader
        title="Emergency Response Dashboard"
        subtitle="Coordinate emergency response and resource deployment"
        actions={
          <button className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg flex items-center gap-2">
            <Siren className="w-4 h-4" />
            Activate Emergency Protocol
          </button>
        }
      />

      {/* Critical Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Critical Zones', value: emergencyZones.filter(z => z.severity === 'severe').length, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Population at Risk', value: totalPopAtRisk.toLocaleString(), icon: Users, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Hospitals Nearby', value: totalHospitals, icon: Building, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Shelters Available', value: totalShelters, icon: Heart, color: 'text-green-600', bg: 'bg-green-50' },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.bg} rounded-xl border border-gray-200 p-5`}>
            <stat.icon className={`w-6 h-6 ${stat.color} mb-2`} />
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-sm text-gray-600 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Emergency Map */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ height: '400px' }}>
          <div className="p-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Emergency Zones Map</h3>
            <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              LIVE
            </span>
          </div>
          <MapContainer
            center={[27.7, 85.5]}
            zoom={8}
            style={{ height: 'calc(100% - 44px)', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {emergencyZones.map((zone) => (
              <CircleMarker
                key={zone.id}
                center={[zone.latitude, zone.longitude]}
                radius={Math.max(10, Math.min(20, zone.populationAtRisk / 1000))}
                pathOptions={{
                  color: severityColors[zone.severity],
                  fillColor: severityColors[zone.severity],
                  fillOpacity: 0.4,
                  weight: 3,
                }}
              >
                <Popup>
                  <div className="min-w-[200px]">
                    <h4 className="font-semibold text-sm">{zone.name}</h4>
                    <p className="text-xs text-gray-500">{zone.district}</p>
                    <div className="mt-2 space-y-1 text-xs">
                      <p><strong>Priority:</strong> #{zone.priorityRank}</p>
                      <p><strong>Population at Risk:</strong> {zone.populationAtRisk.toLocaleString()}</p>
                      <p><strong>Hospitals:</strong> {zone.hospitals}</p>
                      <p><strong>Shelters:</strong> {zone.shelters}</p>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        {/* Priority Ranking */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            Priority Ranking
          </h3>
          <div className="space-y-3">
            {emergencyZones
              .sort((a, b) => a.priorityRank - b.priorityRank)
              .map((zone) => (
                <div
                  key={zone.id}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      zone.priorityRank <= 2 ? 'bg-red-500' : zone.priorityRank <= 4 ? 'bg-orange-500' : 'bg-yellow-500'
                    }`}>
                      {zone.priorityRank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{zone.name}</p>
                      <p className="text-xs text-gray-500">{zone.district}</p>
                    </div>
                    <SeverityBadge severity={zone.severity} size="sm" />
                  </div>
                  <div className="flex items-center gap-3 mt-2 ml-10 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {zone.populationAtRisk.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Building className="w-3 h-3" />
                      {zone.hospitals}H {zone.shelters}S
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Infrastructure Impact */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Siren className="w-4 h-4 text-aztec" />
          Infrastructure Impact Assessment
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2 font-medium text-gray-600">Zone</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Priority</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Population</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Impact</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Resources</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {emergencyZones.map((zone) => (
                <tr key={zone.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{zone.name}</p>
                    <p className="text-xs text-gray-500">{zone.district}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      zone.priorityRank <= 2 ? 'bg-red-500' : zone.priorityRank <= 4 ? 'bg-orange-500' : 'bg-yellow-500'
                    }`}>
                      {zone.priorityRank}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{zone.populationAtRisk.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {zone.infrastructureImpact.map((item, i) => (
                        <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-[10px] text-gray-600">
                          {item}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    🏥 {zone.hospitals} hospitals · 🏠 {zone.shelters} shelters
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
