import { useState } from 'react';
import { historicalEvents } from '../data/mockData';
import { PageHeader } from '../components/ui/PageHeader';
import { SeverityBadge } from '../components/ui/SeverityBadge';
import { History, MapPin, Calendar, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import type { RiskLevel } from '../types';

const states = ['All', 'Bagmati', 'Gandaki'];
const severities: { value: RiskLevel | 'all'; label: string }[] = [
  { value: 'all', label: 'All Severity' },
  { value: 'severe', label: 'Severe' },
  { value: 'high', label: 'High' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'low', label: 'Low' },
];

const years = ['All', '2022', '2023', '2024'];

export function HistoricalPage() {
  const [stateFilter, setStateFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState<RiskLevel | 'all'>('all');
  const [yearFilter, setYearFilter] = useState('All');

  const filteredEvents = historicalEvents.filter((e) => {
    if (stateFilter !== 'All' && e.state !== stateFilter) return false;
    if (severityFilter !== 'all' && e.severity !== severityFilter) return false;
    if (yearFilter !== 'All' && !e.date.startsWith(yearFilter)) return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Historical Events"
        subtitle="Timeline of past landslide events and their impact"
      />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-capri/30"
        >
          {states.map((s) => <option key={s} value={s}>{s === 'All' ? 'All States' : s}</option>)}
        </select>
        <div className="flex items-center gap-1">
          {severities.map((sv) => (
            <button
              key={sv.value}
              onClick={() => setSeverityFilter(sv.value)}
              className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                severityFilter === sv.value
                  ? 'bg-aztec text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {sv.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setYearFilter(y)}
              className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                yearFilter === y
                  ? 'bg-aztec text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Events', value: filteredEvents.length, color: 'text-gray-800' },
          { label: 'Total Casualties', value: filteredEvents.reduce((s, e) => s + e.casualties, 0), color: 'text-red-600' },
          { label: 'Total Displaced', value: filteredEvents.reduce((s, e) => s + e.displaced, 0).toLocaleString(), color: 'text-orange-600' },
          { label: 'Area Affected (km²)', value: filteredEvents.reduce((s, e) => s + e.areaAffected, 0).toFixed(1), color: 'text-purple-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-500">{stat.label}</p>
            <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

        <div className="space-y-6">
          {filteredEvents.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative pl-16"
            >
              {/* Timeline dot */}
              <div className={`absolute left-4 top-5 w-5 h-5 rounded-full border-4 border-white ${
                event.severity === 'severe' ? 'bg-red-500' :
                event.severity === 'high' ? 'bg-orange-500' :
                event.severity === 'moderate' ? 'bg-yellow-500' : 'bg-green-500'
              }`} />

              <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-base font-semibold text-gray-800">{event.name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(event.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {event.district}, {event.state}
                      </span>
                    </div>
                  </div>
                  <SeverityBadge severity={event.severity} size="sm" />
                </div>

                <p className="text-sm text-gray-600 mb-4">{event.description}</p>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-red-600">{event.casualties}</p>
                    <p className="text-[10px] text-gray-500">Casualties</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-orange-600">{event.displaced.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-500">Displaced</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-purple-600">{event.areaAffected}</p>
                    <p className="text-[10px] text-gray-500">km² Affected</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">Trigger Factors:</p>
                  <div className="flex flex-wrap gap-1">
                    {event.triggers.map((trigger, i) => (
                      <span key={i} className="px-2 py-0.5 bg-aztec/5 text-aztec rounded-full text-[10px] font-medium">
                        {trigger}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {filteredEvents.length === 0 && (
        <div className="text-center py-12">
          <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No historical events match the current filters.</p>
        </div>
      )}
    </div>
  );
}
