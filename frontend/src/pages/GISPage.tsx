import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { dashboardService, sensorService } from '../services';
import { PageHeader } from '../components/ui/PageHeader';
import { SeverityBadge } from '../components/ui/SeverityBadge';
import { SkeletonMap } from '../components/ui/LoadingSkeleton';
import { HeatmapLayer } from '../components/ui/HeatmapLayer';
import { Layers } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// LHASA API base (same as mlService)
const API_BASE = (import.meta.env.VITE_LHASA_API_URL as string | undefined ?? '').replace(/\/+$/, '');

const severityColors: Record<string, string> = {
  low: '#22c55e',
  moderate: '#eab308',
  high: '#f97316',
  severe: '#ef4444',
};

const severityRadius: Record<string, number> = {
  low: 8,
  moderate: 10,
  high: 12,
  severe: 15,
};

const layers = [
  { id: 'risk_zones', name: 'Risk Zones', visible: true },
  { id: 'risk_heatmap', name: 'Risk Heatmap', visible: false },
  { id: 'earthquakes', name: 'Live Earthquakes (USGS)', visible: true },
  { id: 'villages', name: 'Villages', visible: true },
  { id: 'roads', name: 'Roads', visible: true },
  { id: 'hospitals', name: 'Hospitals', visible: false },
  { id: 'schools', name: 'Schools', visible: false },
  { id: 'bridges', name: 'Bridges', visible: false },
  { id: 'sensors', name: 'Sensors', visible: false },
];

// Key-free basemaps: OSM streets + Esri World Imagery (satellite).
type BasemapId = 'streets' | 'satellite';
const BASEMAPS: Record<BasemapId, { label: string; url: string; attribution: string }> = {
  streets: {
    label: 'Streets',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  satellite: {
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics',
  },
};

interface Quake {
  id: string;
  magnitude: number;
  place: string;
  latitude: number;
  longitude: number;
  depthKm: number | null;
  timestamp: string | null;
  url: string;
}

async function fetchEarthquakes() {
  const res = await fetch(`${API_BASE}/api/v1/seismic/live?min_magnitude=2.5`);
  if (!res.ok) return { count: 0, events: [] as Quake[] };
  return res.json() as Promise<{ count: number; events: Quake[] }>;
}

function MapLegend() {
  return null;
}

async function fetchHeatGrid() {
  const res = await fetch(`${API_BASE}/api/v1/ml/grid?step=0.25`);
  if (!res.ok) return [];
  return res.json();
}

export function GISPage() {
  const { data: riskZones, isLoading } = useQuery({
    queryKey: ['risk-zones'],
    queryFn: dashboardService.getRiskZones,
    refetchInterval: Number(import.meta.env.VITE_POLL_INTERVAL_MS ?? 60000),
  });

  const { data: sensors } = useQuery({
    queryKey: ['sensors'],
    queryFn: sensorService.getSensors,
    refetchInterval: Number(import.meta.env.VITE_POLL_INTERVAL_MS ?? 60000),
  });

  const { data: heatGrid = [] } = useQuery({
    queryKey: ['heatmap-grid'],
    queryFn: fetchHeatGrid,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const { data: earthquakes } = useQuery({
    queryKey: ['earthquakes'],
    queryFn: fetchEarthquakes,
    staleTime: 300_000,
    refetchInterval: 600_000,
  });

  const [activeLayers, setActiveLayers] = useState(layers);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [basemap, setBasemap] = useState<BasemapId>('streets');

  const toggleLayer = (id: string) => {
    setActiveLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l))
    );
  };

  const selectedZoneData = riskZones?.find((z) => z.id === selectedZone);

  return (
    <div>
      <PageHeader
        title="GIS Risk Monitoring"
        subtitle="Interactive map showing risk zones, sensors, and infrastructure"
        actions={
          <button className="px-4 py-2 bg-aztec text-white text-sm font-medium rounded-lg flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Export Map
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Map */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <SkeletonMap />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ height: '600px' }}>
              <MapContainer
                center={[22.5, 82.0]}
                zoom={5}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  key={basemap}
                  attribution={BASEMAPS[basemap].attribution}
                  url={BASEMAPS[basemap].url}
                />
                <MapLegend />

                {/* Risk Heatmap Layer */}
                {activeLayers.find((l) => l.id === 'risk_heatmap')?.visible && (
                  <HeatmapLayer data={heatGrid} />
                )}

                {/* Risk Zone Markers */}
                {activeLayers.find((l) => l.id === 'risk_zones')?.visible &&
                  riskZones?.map((zone) => (
                    <CircleMarker
                      key={zone.id}
                      center={[zone.latitude, zone.longitude]}
                      radius={severityRadius[zone.severity]}
                      pathOptions={{
                        color: severityColors[zone.severity],
                        fillColor: severityColors[zone.severity],
                        fillOpacity: 0.6,
                        weight: 2,
                      }}
                      eventHandlers={{
                        click: () => setSelectedZone(zone.id),
                      }}
                    >
                      <Popup>
                        <div className="min-w-[200px]">
                          <h4 className="font-semibold text-sm">{zone.name}</h4>
                          <p className="text-xs text-gray-500">{zone.district}</p>
                          <div className="mt-2 space-y-1">
                            <p className="text-xs"><strong>Risk Score:</strong> {zone.riskScore}/100</p>
                            <p className="text-xs"><strong>Severity:</strong> {zone.severity}</p>
                            <p className="text-xs"><strong>Population:</strong> {zone.population?.toLocaleString()}</p>
                            <p className="text-xs"><strong>Last Updated:</strong> {new Date(zone.lastUpdated).toLocaleString()}</p>
                          </div>
                          {zone.factors.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium">Factors:</p>
                              <ul className="text-xs text-gray-500">
                                {zone.factors.map((f, i) => (
                                  <li key={i}>• {f}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}

                {/* Live earthquakes (USGS) — seismic context for landslide risk */}
                {activeLayers.find((l) => l.id === 'earthquakes')?.visible &&
                  earthquakes?.events.map((quake) => (
                    <CircleMarker
                      key={quake.id}
                      center={[quake.latitude, quake.longitude]}
                      radius={Math.max(4, Math.min(14, quake.magnitude * 3))}
                      pathOptions={{
                        color: '#7c3aed',
                        fillColor: '#a78bfa',
                        fillOpacity: 0.55,
                        weight: 1.5,
                        dashArray: '3 3',
                      }}
                    >
                      <Popup>
                        <div className="min-w-[180px]">
                          <h4 className="font-semibold text-sm">M{quake.magnitude} — {quake.place}</h4>
                          <div className="mt-2 space-y-1 text-xs text-gray-600">
                            <p><strong>Depth:</strong> {quake.depthKm ?? '—'} km</p>
                            <p><strong>Time:</strong> {quake.timestamp ? new Date(quake.timestamp).toLocaleString() : '—'}</p>
                            {quake.url && (
                              <a className="text-capri" href={quake.url} target="_blank" rel="noreferrer">
                                USGS event page →
                              </a>
                            )}
                          </div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}

                {/* Sensor Markers */}
                {activeLayers.find((l) => l.id === 'sensors')?.visible &&
                  sensors?.map((sensor) => (
                    <CircleMarker
                      key={sensor.id}
                      center={[sensor.latitude, sensor.longitude]}
                      radius={5}
                      pathOptions={{
                        color: sensor.status === 'online' ? '#22c55e' : sensor.status === 'warning' ? '#eab308' : '#ef4444',
                        fillColor: sensor.status === 'online' ? '#22c55e' : sensor.status === 'warning' ? '#eab308' : '#ef4444',
                        fillOpacity: 0.8,
                        weight: 1,
                      }}
                    >
                      <Popup>
                        <div className="min-w-[180px]">
                          <h4 className="font-semibold text-sm">{sensor.name}</h4>
                          <p className="text-xs text-gray-500">{sensor.id}</p>
                          <div className="mt-2 space-y-1">
                            <p className="text-xs"><strong>Type:</strong> {sensor.type.replace(/_/g, ' ')}</p>
                            <p className="text-xs"><strong>Status:</strong> {sensor.status}</p>
                            <p className="text-xs"><strong>Reading:</strong> {sensor.lastReading} {sensor.unit}</p>
                            <p className="text-xs"><strong>Battery:</strong> {sensor.batteryLevel == null ? 'Not reported' : `${sensor.batteryLevel}%`}</p>
                          </div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
              </MapContainer>
            </div>
          )}
        </div>

        {/* Sidebar Controls */}
        <div className="space-y-4">
          {/* Basemap switch + Layer Toggles */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-aztec" />
              Map Layers
            </h3>
            <div className="flex gap-2 mb-3">
              {(Object.keys(BASEMAPS) as BasemapId[]).map((id) => (
                <button
                  key={id}
                  onClick={() => setBasemap(id)}
                  className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    basemap === id
                      ? 'bg-aztec text-white border-aztec'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {BASEMAPS[id].label}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {activeLayers.map((layer) => (
                <label key={layer.id} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={layer.visible}
                    onChange={() => toggleLayer(layer.id)}
                    className="w-4 h-4 text-aztec rounded border-gray-300 focus:ring-capri"
                  />
                  <span className="text-sm text-gray-600 group-hover:text-gray-800">{layer.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Risk Legend</h3>
            <div className="space-y-2">
              {              [
                { level: 'Low', color: '#22c55e', range: '0-9' },
                { level: 'Moderate', color: '#eab308', range: '10-49' },
                { level: 'High', color: '#f97316', range: '50-89' },
                { level: 'Severe', color: '#ef4444', range: '90-100' },
              ].map((item) => (
                <div key={item.level} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-gray-600 flex-1">{item.level}</span>
                  <span className="text-xs text-gray-400">{item.range}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Zone Detail */}
          {selectedZoneData && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">{selectedZoneData.name}</h3>
              <p className="text-xs text-gray-500 mb-3">{selectedZoneData.district}, {selectedZoneData.state}</p>
              <div className="flex items-center gap-2 mb-3">
                <SeverityBadge severity={selectedZoneData.severity} size="sm" />
                <span className="text-sm font-bold text-gray-800">{selectedZoneData.riskScore}/100</span>
              </div>
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Population at Risk</span>
                  <span className="font-medium">{selectedZoneData.population?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Updated</span>
                  <span className="font-medium">{new Date(selectedZoneData.lastUpdated).toLocaleString()}</span>
                </div>
              </div>
              {selectedZoneData.description && (
                <p className="text-xs text-gray-500 mt-3">{selectedZoneData.description}</p>
              )}
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-700 mb-1">Risk Factors:</p>
                <div className="flex flex-wrap gap-1">
                  {selectedZoneData.factors.map((factor, i) => (
                    <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px]">
                      {factor}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
