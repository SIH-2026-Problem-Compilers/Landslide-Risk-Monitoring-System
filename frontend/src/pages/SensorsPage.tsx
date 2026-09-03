import { useQuery } from '@tanstack/react-query';
import { sensorService } from '../services';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/SeverityBadge';
import { SkeletonCard } from '../components/ui/LoadingSkeleton';
import {
  Radio, Droplets, CloudRain, Thermometer, Activity, Battery, Wifi, WifiOff,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';

const sensorTypeIcons: Record<string, typeof Radio> = {
  soil_moisture: Droplets,
  rainfall: CloudRain,
  temperature: Thermometer,
  tilt: Activity,
  seismic: Activity,
};

const sensorTypeColors: Record<string, string> = {
  soil_moisture: 'text-blue-500 bg-blue-50',
  rainfall: 'text-cyan-500 bg-cyan-50',
  temperature: 'text-orange-500 bg-orange-50',
  tilt: 'text-purple-500 bg-purple-50',
  seismic: 'text-red-500 bg-red-50',
};

export function SensorsPage() {
  const { data: sensors, isLoading } = useQuery({
    queryKey: ['sensors'],
    queryFn: sensorService.getSensors,
  });

  const { data: readings } = useQuery({
    queryKey: ['sensor-readings'],
    queryFn: () => sensorService.getSensorReadings('SNS-001', 24),
  });

  const onlineCount = sensors?.filter((s) => s.status === 'online').length || 0;
  const offlineCount = sensors?.filter((s) => s.status === 'offline').length || 0;
  const warningCount = sensors?.filter((s) => s.status === 'warning').length || 0;
  const maintenanceCount = sensors?.filter((s) => s.status === 'maintenance').length || 0;

  return (
    <div>
      <PageHeader
        title="Sensor Monitoring"
        subtitle="Real-time IoT sensor network status and readings"
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
            <p className="text-xs text-gray-500">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Live Reading Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Live Sensor Readings (24h)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={readings || []}>
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
      </div>

      {/* Sensor Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : sensors?.map((sensor, index) => {
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
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span>{sensor.district}</span>
                    <span>Updated {sensor.lastUpdated ? new Date(sensor.lastUpdated).toLocaleTimeString() : 'N/A'}</span>
                  </div>
                </motion.div>
              );
            })}
      </div>
    </div>
  );
}
