import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sensorService } from '../services';
import { connectSerialStation, serialSupported, type SerialConnection } from '../services/serialSensor';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/SeverityBadge';
import { SkeletonCard } from '../components/ui/LoadingSkeleton';
import { EmptyState } from '../components/ui/EmptyState';
import {
  Radio, Droplets, CloudRain, Thermometer, Activity, Battery, Wifi, WifiOff,
  Usb, MapPin, Crosshair, RefreshCw,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';
import type { Sensor } from '../types';

const sensorTypeIcons: Record<string, typeof Radio> = {
  soil_moisture: Droplets,
  rainfall: CloudRain,
  temperature: Thermometer,
  humidity: Droplets, // DHT11 stations pushed by the ESP32 IoT firmware
  tilt: Activity,
  seismic: Activity,
  battery: Battery,
};

const sensorTypeColors: Record<string, string> = {
  soil_moisture: 'text-blue-500 bg-blue-50',
  rainfall: 'text-cyan-500 bg-cyan-50',
  temperature: 'text-orange-500 bg-orange-50',
  humidity: 'text-teal-500 bg-teal-50',
  tilt: 'text-purple-500 bg-purple-50',
  seismic: 'text-red-500 bg-red-50',
  battery: 'text-green-500 bg-green-50',
};

type GpsStatus = 'idle' | 'locating' | 'active' | 'denied' | 'unavailable' | 'manual';

interface GpsState {
  status: GpsStatus;
  latitude?: number;
  longitude?: number;
  accuracyM?: number;
  zoneName?: string;
  updatedAt?: string;
}

interface LinkState {
  status: 'idle' | 'connecting' | 'connected' | 'error';
  stationId?: string;
  message?: string;
  lastPacketAt?: string;
  packets: number;
}

const GPS_LABELS: Record<GpsStatus, string> = {
  idle: 'Not started',
  locating: 'Acquiring laptop GPS…',
  active: 'Laptop GPS active',
  denied: 'Location permission denied',
  unavailable: 'Laptop location unavailable',
  manual: 'Manual coordinates',
};

const LOCATION_LABELS: Record<string, string> = {
  sensor_gps: 'Sensor GPS',
  laptop_gps: 'Laptop GPS fallback',
  manual: 'Manual position',
  zone: 'Zone centre (estimated)',
  unknown: 'No position',
};

function formatCoord(value?: number | null, digits = 5) {
  return value == null ? '—' : value.toFixed(digits);
}

function formatAge(seconds?: number | null) {
  if (seconds == null) return 'N/A';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

function locationLabel(sensor: Sensor) {
  const base = LOCATION_LABELS[sensor.locationSource] ?? sensor.locationSource;
  if (sensor.locationAccuracyM != null) return `${base} · ±${Math.round(sensor.locationAccuracyM)} m`;
  return base;
}

export function SensorsPage() {
  const queryClient = useQueryClient();
  const { data: sensors, isLoading } = useQuery({
    queryKey: ['sensors'],
    queryFn: sensorService.getSensors,
    refetchInterval: Number(import.meta.env.VITE_POLL_INTERVAL_MS ?? 15000),
  });

  const [gps, setGps] = useState<GpsState>(() =>
    typeof navigator !== 'undefined' && 'geolocation' in navigator
      ? { status: 'locating' }
      : { status: 'unavailable' },
  );
  const [link, setLink] = useState<LinkState>({ status: 'idle', packets: 0 });
  const [manualOpen, setManualOpen] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLon, setManualLon] = useState('');

  // Keep the latest fix in a ref so serial packets never send stale coords.
  const gpsRef = useRef<{ latitude: number; longitude: number; accuracyM?: number } | null>(null);
  const connectionRef = useRef<SerialConnection | null>(null);
  const stationIdRef = useRef('USB-SENSOR-1');
  const mountedRef = useRef(true);
  const lastHeartbeatRef = useRef(0);
  const lastTelemetryRef = useRef({ signature: '', at: 0 });

  const sendHeartbeat = useCallback(
    async (source: 'laptop_gps' | 'manual' = 'laptop_gps') => {
      const position = gpsRef.current;
      if (!position) return;
      const result = await sensorService.sendHeartbeat({
        latitude: position.latitude,
        longitude: position.longitude,
        accuracyM: position.accuracyM,
        source,
      });
      if (result && mountedRef.current) {
        setGps((prev) => ({
          ...prev,
          zoneName: result.zoneName,
          updatedAt: new Date().toISOString(),
        }));
      }
    },
    [],
  );

  // Request the laptop position (Windows/macOS location services) and watch it.
  useEffect(() => {
    mountedRef.current = true;
    if (!('geolocation' in navigator)) return;
    const onSuccess = (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = position.coords;
      gpsRef.current = { latitude, longitude, accuracyM: accuracy };
      if (!mountedRef.current) return;
      setGps((prev) => ({
        ...prev,
        status: 'active',
        latitude,
        longitude,
        accuracyM: accuracy,
        updatedAt: new Date().toISOString(),
      }));
      // Watch updates can arrive every few seconds; limit the API chatter.
      if (Date.now() - lastHeartbeatRef.current > 30_000) {
        lastHeartbeatRef.current = Date.now();
        void sendHeartbeat('laptop_gps');
      }
    };
    const onError = (error: GeolocationPositionError) => {
      if (!mountedRef.current) return;
      setGps((prev) =>
        prev.status === 'active' || prev.status === 'manual'
          ? prev
          : {
              status: error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable',
            },
      );
    };
    const watchId = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000,
    });

    // Heartbeat every minute so a GPS-less station keeps a fresh position and
    // the dashboard can tell this laptop is still alive.
    const heartbeat = setInterval(() => {
      void sendHeartbeat('laptop_gps');
    }, 60_000);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(heartbeat);
      mountedRef.current = false;
    };
  }, [sendHeartbeat]);

  // Stop any open serial port when leaving the page.
  useEffect(() => {
    return () => {
      void connectionRef.current?.stop();
      connectionRef.current = null;
    };
  }, []);

  const requestGpsAgain = () => {
    if (!navigator.geolocation) {
      setGps({ status: 'unavailable' });
      return;
    }
    setGps({ status: 'locating' });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        gpsRef.current = { latitude, longitude, accuracyM: accuracy };
        setGps({
          status: 'active',
          latitude,
          longitude,
          accuracyM: accuracy,
          updatedAt: new Date().toISOString(),
        });
        void sendHeartbeat('laptop_gps');
      },
      (error) =>
        setGps({
          status: error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable',
        }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const submitManualPosition = async (event: FormEvent) => {
    event.preventDefault();
    if (!manualLat.trim() || !manualLon.trim()) return;
    const latitude = Number(manualLat);
    const longitude = Number(manualLon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return;
    gpsRef.current = { latitude, longitude };
    setGps({
      status: 'manual',
      latitude,
      longitude,
      updatedAt: new Date().toISOString(),
    });
    setManualOpen(false);
    await sendHeartbeat('manual');
  };

  const handleConnectSensor = async () => {
    if (!serialSupported()) {
      setLink({
        status: 'error',
        packets: link.packets,
        message: 'Web Serial needs Chrome or Edge on localhost (http://127.0.0.1:5173).',
      });
      return;
    }
    setLink({ status: 'connecting', packets: link.packets });
    try {
      const connection = await connectSerialStation(async (packet) => {
        const laptop = gpsRef.current;
        const stationId = packet.stationId ?? stationIdRef.current;
        // A board may print both a debug line and the JSON body for one cycle;
        // skip the duplicate instead of double-counting the reading.
        const signature = `${stationId}:${packet.readings
          .map((reading) => `${reading.sensor_type}=${reading.value}`)
          .sort()
          .join(',')}`;
        const now = Date.now();
        if (signature === lastTelemetryRef.current.signature && now - lastTelemetryRef.current.at < 3000) {
          return;
        }
        lastTelemetryRef.current = { signature, at: now };
        // A board with its own GPS reports coordinates; otherwise the laptop
        // position is the fallback so the station still lands on the map.
        const hasOwnGps = packet.latitude != null && packet.longitude != null;
        const position = hasOwnGps
          ? { latitude: packet.latitude as number, longitude: packet.longitude as number, source: 'sensor_gps' as const }
          : laptop
            ? { ...laptop, source: 'laptop_gps' as const }
            : null;
        const ok = await sensorService.ingestTelemetry(
          {
            station_id: stationId,
            name: packet.name ?? 'My sensor station',
            zone_id: packet.zoneId,
            latitude: position?.latitude,
            longitude: position?.longitude,
            location_source: position?.source,
            location_accuracy_m: position?.source === 'laptop_gps' ? position.accuracyM : undefined,
          },
          packet.readings,
        );
        if (!ok || !mountedRef.current) return;
        setLink((prev) => ({
          status: 'connected',
          stationId,
          packets: prev.packets + 1,
          lastPacketAt: new Date().toISOString(),
        }));
        void queryClient.invalidateQueries({ queryKey: ['sensors'] });
        void queryClient.invalidateQueries({ queryKey: ['sensor-readings'] });
        void queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      });
      connectionRef.current = connection;
      if (!mountedRef.current) {
        await connection.stop();
        return;
      }
      setLink({
        status: 'connected',
        stationId: stationIdRef.current,
        packets: 0,
        message: 'Port open — waiting for the first reading…',
      });
    } catch (err) {
      setLink({
        status: 'error',
        packets: link.packets,
        message: err instanceof Error ? err.message : 'Could not open the serial port.',
      });
    }
  };

  const handleDisconnectSensor = async () => {
    await connectionRef.current?.stop();
    connectionRef.current = null;
    setLink({ status: 'idle', packets: 0 });
  };

  // Live data only — chart the primary real sensor (local station first).
  const sensorList = sensors ?? [];
  const primarySensor =
    [...sensorList]
      .filter((sensor) => sensor.isLocal)
      .sort((a, b) => Date.parse(b.lastUpdated) - Date.parse(a.lastUpdated))[0] ??
    sensorList[0];
  const { data: readings } = useQuery({
    queryKey: ['sensor-readings', primarySensor?.id],
    queryFn: () => sensorService.getSensorReadings(primarySensor!.id, 24),
    enabled: !!primarySensor,
    refetchInterval: Number(import.meta.env.VITE_POLL_INTERVAL_MS ?? 60000),
  });

  const onlineCount = sensorList.filter((s) => s.status === 'online').length;
  const offlineCount = sensorList.filter((s) => s.status === 'offline').length;
  const warningCount = sensorList.filter((s) => s.status === 'warning').length;
  const maintenanceCount = sensorList.filter((s) => s.status === 'maintenance').length;
  const stationCount = new Set(sensorList.map((s) => s.stationId)).size;

  return (
    <div>
      <PageHeader
        title="Sensor Monitoring"
        subtitle="Live network status — only stations that actually report are listed; laptop GPS places a GPS-less sensor on the map"
        actions={
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-green-700">Live Monitoring</span>
          </div>
        }
      />

      {/* Status Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Online', value: onlineCount, icon: Wifi, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Offline', value: offlineCount, icon: WifiOff, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Warning', value: warningCount, icon: Battery, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Maintenance', value: maintenanceCount, icon: Radio, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${stat.bg} rounded-xl border border-gray-200 p-4`}
          >
            <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-500">
              {stat.label}
              {stat.label === 'Online' && stationCount > 0 ? ` · ${stationCount} station${stationCount === 1 ? '' : 's'}` : ''}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Live demo link: laptop GPS + locally connected sensor */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Live Demo Link</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Laptop GPS supplies the location for a sensor with no GPS module. Readings are real — nothing is simulated.
            </p>
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            link.status === 'connected'
              ? 'bg-green-50 text-green-700'
              : link.status === 'error'
                ? 'bg-red-50 text-red-700'
                : 'bg-gray-50 text-gray-600'
          }`}>
            {link.status === 'connected' ? 'Sensor linked' : link.status === 'connecting' ? 'Connecting…' : link.status === 'error' ? 'Link error' : 'Not linked'}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Laptop GPS */}
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-aztec" />
                Laptop GPS
              </p>
              <span className={`text-[11px] font-medium ${
                gps.status === 'active' || gps.status === 'manual' ? 'text-green-600' : 'text-gray-500'
              }`}>
                {GPS_LABELS[gps.status]}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div>
                <p className="text-[11px] text-gray-400">Latitude</p>
                <p className="font-medium">{formatCoord(gps.latitude)}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400">Longitude</p>
                <p className="font-medium">{formatCoord(gps.longitude)}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400">Accuracy</p>
                <p className="font-medium">{gps.accuracyM == null ? '—' : `±${Math.round(gps.accuracyM)} m`}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400">Nearest zone</p>
                <p className="font-medium truncate">{gps.zoneName ?? '—'}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                type="button"
                onClick={requestGpsAgain}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry GPS
              </button>
              <button
                type="button"
                onClick={() => setManualOpen((open) => !open)}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
              >
                Enter coordinates
              </button>
            </div>
            {manualOpen && (
              <form onSubmit={submitManualPosition} className="flex items-end gap-2 mt-3">
                <label className="flex-1 text-[11px] text-gray-500">
                  Latitude
                  <input
                    value={manualLat}
                    onChange={(event) => setManualLat(event.target.value)}
                    inputMode="decimal"
                    placeholder="23.73000"
                    className="mt-1 w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
                  />
                </label>
                <label className="flex-1 text-[11px] text-gray-500">
                  Longitude
                  <input
                    value={manualLon}
                    onChange={(event) => setManualLon(event.target.value)}
                    inputMode="decimal"
                    placeholder="92.72000"
                    className="mt-1 w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white"
                  />
                </label>
                <button
                  type="submit"
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-aztec text-white hover:opacity-90"
                >
                  Apply
                </button>
              </form>
            )}
          </div>

          {/* USB sensor */}
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Usb className="w-3.5 h-3.5 text-aztec" />
                Connected sensor (USB)
              </p>
              <span className="text-[11px] font-medium text-gray-500">
                {link.status === 'connected' ? link.stationId : 'Not connected'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div>
                <p className="text-[11px] text-gray-400">Packets received</p>
                <p className="font-medium">{link.packets}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400">Last packet</p>
                <p className="font-medium">
                  {link.lastPacketAt ? new Date(link.lastPacketAt).toLocaleTimeString() : '—'}
                </p>
              </div>
            </div>
            <p className="text-[11px] text-gray-500 mt-2">
              {link.message ??
                'Connect the board over USB. One JSON line per reading cycle is forwarded with the laptop position.'}
            </p>
            <div className="flex gap-2 mt-3">
              {link.status === 'connected' ? (
                <button
                  type="button"
                  onClick={handleDisconnectSensor}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectSensor}
                  disabled={link.status === 'connecting'}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-aztec text-white hover:opacity-90 disabled:opacity-60"
                >
                  {link.status === 'connecting' ? 'Opening port…' : 'Connect sensor'}
                </button>
              )}
            </div>
            {!serialSupported() && (
              <p className="text-[11px] text-amber-600 mt-2">
                USB detection needs Chrome/Edge. Wi-Fi stations that push to the API appear automatically.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Live Reading Chart — real stored readings only, never synthetic */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800">
            Live Sensor Readings (24h)
            {primarySensor ? ` — ${primarySensor.name}` : ''}
          </h3>
          {primarySensor && (
            <span className="text-xs text-gray-400">
              {primarySensor.id} · {primarySensor.unit}
            </span>
          )}
        </div>
        {!readings?.length ? (
          <div className="h-[200px] flex items-center justify-center text-sm text-gray-400 text-center px-4">
            No live readings stored yet — this chart plots real stored
            measurements only. Connect your sensor above (or let a Wi-Fi
            station push to POST /api/v1/sensors/ingest) and it fills in
            immediately.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={readings}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="timestamp"
                tick={{ fontSize: 10 }}
                stroke="#94a3b8"
                tickFormatter={(val) => new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                labelFormatter={(val) => String(val) ? new Date(String(val)).toLocaleString() : ''}
              />
              <Line type="monotone" dataKey="value" stroke="#00B9F1" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Sensor Grid — live API data only (no mock fallback) */}
      {!isLoading && sensorList.length === 0 ? (
        <EmptyState
          icon={WifiOff}
          title="No live sensor data"
          description="Stations appear here after their first real reading. Connect your sensor over USB above, or let an ESP32 push to the API over Wi-Fi — the laptop GPS position is used automatically when the sensor has no GPS module."
        />
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : sensorList.map((sensor, index) => {
              const Icon = sensorTypeIcons[sensor.type] || Radio;
              const typeColor = sensorTypeColors[sensor.type] || 'text-gray-500 bg-gray-50';
              return (
                <motion.div
                  key={sensor.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${typeColor}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{sensor.name}</p>
                        <p className="text-xs text-gray-500">{sensor.id}</p>
                      </div>
                    </div>
                    <StatusBadge status={sensor.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Reading</p>
                      <p className="text-lg font-bold text-gray-900">
                        {sensor.lastReading} <span className="text-xs font-normal text-gray-500">{sensor.unit}</span>
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Battery</p>
                      {sensor.batteryLevel == null ? (
                        <span className="text-sm text-gray-400">Not reported</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                sensor.batteryLevel > 60 ? 'bg-green-500' :
                                sensor.batteryLevel > 30 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${sensor.batteryLevel}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700">{sensor.batteryLevel}%</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-start gap-1.5 text-xs text-gray-500">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate">
                        {locationLabel(sensor)}
                        {sensor.isLocal && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded bg-capri/10 text-[10px] font-medium text-aztec">
                            My sensor
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {formatCoord(sensor.latitude)}, {formatCoord(sensor.longitude)}
                        {sensor.zoneId ? ` · ${sensor.zoneId}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span>{sensor.district}</span>
                    <span>
                      {sensor.ageSeconds != null
                        ? formatAge(sensor.ageSeconds)
                        : `Updated ${sensor.lastUpdated ? new Date(sensor.lastUpdated).toLocaleTimeString() : 'N/A'}`}
                    </span>
                  </div>
                </motion.div>
              );
            })}
      </div>
      )}
    </div>
  );
}
