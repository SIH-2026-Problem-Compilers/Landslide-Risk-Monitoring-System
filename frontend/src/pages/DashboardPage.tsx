import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services';
import { StatCard } from '../components/ui/StatCard';
import { SeverityBadge } from '../components/ui/SeverityBadge';
import { PageHeader } from '../components/ui/PageHeader';
import { SkeletonCard } from '../components/ui/LoadingSkeleton';
import {
  AlertTriangle,
  MapPin,
  Radio,
  Route,
  FileText,
  TrendingUp,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';

export function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: dashboardService.getSummary,
  });

  const { data: alerts } = useQuery({
    queryKey: ['alerts'],
    queryFn: dashboardService.getAlerts,
  });

  const { data: trends } = useQuery({
    queryKey: ['risk-trends'],
    queryFn: dashboardService.getRiskTrends,
  });

  const { data: severityData } = useQuery({
    queryKey: ['severity-distribution'],
    queryFn: dashboardService.getSeverityDistribution,
  });

  const { data: districtData } = useQuery({
    queryKey: ['district-risk'],
    queryFn: dashboardService.getDistrictRiskData,
  });

  const stats = summary
    ? [
        { title: 'Active Alerts', value: summary.totalActiveAlerts, icon: AlertTriangle, color: 'text-red-500', bgColor: 'bg-red-50', change: 15 },
        { title: 'High Risk Zones', value: summary.highRiskZones, icon: MapPin, color: 'text-orange-500', bgColor: 'bg-orange-50', change: 8 },
        { title: 'Moderate Risk Zones', value: summary.moderateRiskZones, icon: TrendingUp, color: 'text-yellow-500', bgColor: 'bg-yellow-50', change: -3 },
        { title: 'Sensors Online', value: summary.sensorStationsOnline, icon: Radio, color: 'text-green-500', bgColor: 'bg-green-50', change: 2 },
        { title: 'Roads Blocked', value: summary.roadsBlocked, icon: Route, color: 'text-purple-500', bgColor: 'bg-purple-50', change: 3 },
        { title: 'Citizen Reports', value: summary.citizenReports, icon: FileText, color: 'text-blue-500', bgColor: 'bg-blue-50', change: 12 },
      ]
    : [];

  const COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444'];

  return (
    <div>
      <PageHeader
        title="Dashboard Overview"
        subtitle="Real-time landslide risk monitoring across all districts"
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {summaryLoading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : stats.map((stat) => <StatCard key={stat.title} {...stat} />)}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Risk Trend */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Risk Trend (7 Days)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trends || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
              />
              <Line type="monotone" dataKey="riskScore" stroke="#002E6E" strokeWidth={2} dot={{ r: 3 }} name="Risk Score" />
              <Line type="monotone" dataKey="rainfall" stroke="#00B9F1" strokeWidth={2} dot={{ r: 3 }} name="Rainfall (mm)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Severity Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Severity Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={severityData || []}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
              >
                {(severityData || []).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {(severityData || []).map((item, index) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                <span className="text-gray-600">{item.name}</span>
                <span className="font-medium text-gray-800 ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* District Comparison & Recent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* District Risk Comparison */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">District Risk Comparison</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={districtData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="district" tick={{ fontSize: 10 }} stroke="#94a3b8" angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Bar dataKey="low" stackId="a" fill="#22c55e" name="Low" />
              <Bar dataKey="moderate" stackId="a" fill="#eab308" name="Moderate" />
              <Bar dataKey="high" stackId="a" fill="#f97316" name="High" />
              <Bar dataKey="severe" stackId="a" fill="#ef4444" name="Severe" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Alerts */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Recent Alerts</h3>
          <div className="space-y-3 max-h-[260px] overflow-y-auto scrollbar-thin">
            {(alerts || []).slice(0, 6).map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{alert.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{alert.district} • {new Date(alert.createdAt).toLocaleTimeString()}</p>
                </div>
                <SeverityBadge severity={alert.severity} size="sm" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
