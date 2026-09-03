import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services';
import { PageHeader } from '../components/ui/PageHeader';
import { SkeletonChart } from '../components/ui/LoadingSkeleton';
import { BarChart3, TrendingUp, PieChart as PieChartIcon, Droplets } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';

const COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444'];

export function AnalyticsPage() {
  const { data: trends, isLoading } = useQuery({
    queryKey: ['risk-trends'],
    queryFn: dashboardService.getRiskTrends,
  });

  const { data: districtData } = useQuery({
    queryKey: ['district-risk'],
    queryFn: dashboardService.getDistrictRiskData,
  });

  const { data: severityData } = useQuery({
    queryKey: ['severity-distribution'],
    queryFn: dashboardService.getSeverityDistribution,
  });

  const { data: rainfallData } = useQuery({
    queryKey: ['rainfall-risk'],
    queryFn: dashboardService.getRainfallVsRisk,
  });

  return (
    <div>
      <PageHeader
        title="Risk Analytics"
        subtitle="Comprehensive analysis of landslide risk patterns and trends"
      />

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonChart key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Risk Trend Line Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-aztec" />
              <h3 className="text-sm font-semibold text-gray-800">Risk Trend Over Time</h3>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trends || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Legend />
                <Line type="monotone" dataKey="riskScore" stroke="#002E6E" strokeWidth={2} dot={{ r: 3 }} name="Risk Score" />
                <Line type="monotone" dataKey="alerts" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Alerts" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* District Risk Comparison */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-aztec" />
              <h3 className="text-sm font-semibold text-gray-800">District Risk Comparison</h3>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={districtData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="district" tick={{ fontSize: 9 }} stroke="#94a3b8" angle={-25} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Legend />
                <Bar dataKey="low" stackId="a" fill="#22c55e" name="Low" />
                <Bar dataKey="moderate" stackId="a" fill="#eab308" name="Moderate" />
                <Bar dataKey="high" stackId="a" fill="#f97316" name="High" />
                <Bar dataKey="severe" stackId="a" fill="#ef4444" name="Severe" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Severity Distribution Pie */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <PieChartIcon className="w-4 h-4 text-aztec" />
              <h3 className="text-sm font-semibold text-gray-800">Severity Distribution</h3>
            </div>
            <div className="flex items-center">
              <ResponsiveContainer width="60%" height={280}>
                <PieChart>
                  <Pie
                    data={severityData || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    label={({ value }) => `${value} zones`}
                  >
                    {(severityData || []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {(severityData || []).map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.value} zones</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Rainfall vs Risk Area Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Droplets className="w-4 h-4 text-aztec" />
              <h3 className="text-sm font-semibold text-gray-800">Rainfall vs Risk Correlation</h3>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={rainfallData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Legend />
                <Area type="monotone" dataKey="rainfall" stroke="#00B9F1" fill="#00B9F1" fillOpacity={0.2} name="Rainfall (mm)" />
                <Area type="monotone" dataKey="riskScore" stroke="#002E6E" fill="#002E6E" fillOpacity={0.15} name="Risk Score" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
