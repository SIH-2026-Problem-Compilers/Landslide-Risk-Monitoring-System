import { useQuery } from '@tanstack/react-query';
import { mlService } from '../services';
import { PageHeader } from '../components/ui/PageHeader';
import { SeverityBadge } from '../components/ui/SeverityBadge';
import { SkeletonCard } from '../components/ui/LoadingSkeleton';
import {
  Brain,
  Clock,
  Target,
  AlertTriangle,
  TrendingUp,
  Shield,
  Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';

export function PredictionsPage() {
  const { data: predictions, isLoading } = useQuery({
    queryKey: ['predictions'],
    queryFn: mlService.getPredictions,
  });

  const { data: forecasts } = useQuery({
    queryKey: ['forecasts'],
    queryFn: mlService.getForecasts,
  });

  const { data: recommendations } = useQuery({
    queryKey: ['recommendations'],
    queryFn: mlService.getRecommendations,
  });

  const topPrediction = predictions?.[0];

  return (
    <div>
      <PageHeader
        title="Landslide Predictions"
        subtitle="AI-powered risk assessment and forecasting"
        actions={
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-green-700">ML Engine Active</span>
          </div>
        }
      />

      {/* Current Prediction - Hero Card */}
      <div className="mb-6">
        {isLoading ? (
          <SkeletonCard />
        ) : topPrediction && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-aztec to-aztec-light rounded-2xl p-6 text-white"
          >
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-capri" />
              <span className="text-sm font-medium text-white/80">Current Top Prediction</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-white/60 mb-1">Zone</p>
                <p className="text-xl font-bold">{topPrediction.zoneName}</p>
              </div>
              <div>
                <p className="text-sm text-white/60 mb-1">Risk Score</p>
                <div className="flex items-end gap-2">
                  <p className="text-4xl font-bold">{topPrediction.riskScore}</p>
                  <p className="text-sm text-white/60 mb-1">/100</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-white/60 mb-1">Probability</p>
                <div className="flex items-end gap-2">
                  <p className="text-4xl font-bold">{(topPrediction.probability * 100).toFixed(0)}%</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-white/60 mb-1">Confidence</p>
                <div className="flex items-end gap-2">
                  <p className="text-4xl font-bold">{(topPrediction.confidence * 100).toFixed(0)}%</p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-white/60">Factors:</span>
              <div className="flex flex-wrap gap-1">
                {topPrediction.factors.map((factor, i) => (
                  <span key={i} className="px-2 py-0.5 bg-white/10 rounded-full text-xs text-white/80">
                    {factor}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Forecasts */}
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          : forecasts?.map((forecast) => {
              const periodLabels = { '24h': '24 Hours', '48h': '48 Hours', '72h': '72 Hours' };
              const periodIcons = { '24h': Clock, '48h': TrendingUp, '72h': Shield };
              const PIcon = periodIcons[forecast.period];
              return (
                <div key={forecast.period} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <PIcon className="w-4 h-4 text-aztec" />
                      <h3 className="text-sm font-semibold text-gray-800">{periodLabels[forecast.period]} Forecast</h3>
                    </div>
                    <SeverityBadge severity={forecast.severity} size="sm" />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">Risk Score</span>
                        <span className="font-bold text-gray-800">{forecast.riskScore}/100</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${forecast.riskScore}%`,
                            backgroundColor:
                              forecast.riskScore > 80 ? '#ef4444' :
                              forecast.riskScore > 60 ? '#f97316' :
                              forecast.riskScore > 40 ? '#eab308' : '#22c55e',
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Probability</span>
                      <span className="font-medium text-gray-800">{(forecast.probability * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Expected Rainfall</span>
                      <span className="font-medium text-gray-800">{forecast.rainfall}mm</span>
                    </div>
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-700 mb-1">Factors:</p>
                      <ul className="text-xs text-gray-500 space-y-0.5">
                        {forecast.factors.map((f, i) => (
                          <li key={i}>• {f}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
      </div>

      {/* All Predictions Table */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Target className="w-4 h-4 text-aztec" />
              Zone Predictions
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-4 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                ))
              : predictions?.map((pred) => (
                  <div key={pred.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-800">{pred.zoneName}</h4>
                      <SeverityBadge severity={pred.severity} size="sm" />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Score: <strong className="text-gray-800">{pred.riskScore}</strong></span>
                      <span>Prob: <strong className="text-gray-800">{(pred.probability * 100).toFixed(0)}%</strong></span>
                      <span>Conf: <strong className="text-gray-800">{(pred.confidence * 100).toFixed(0)}%</strong></span>
                    </div>
                  </div>
                ))}
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-aztec" />
            AI Recommendations
          </h3>
          <div className="space-y-3">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse p-3 bg-gray-50 rounded-lg">
                    <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-2 bg-gray-100 rounded w-full" />
                  </div>
                ))
              : recommendations?.map((rec) => (
                  <div key={rec.id} className={`p-3 rounded-lg border ${
                    rec.priority === 'high' ? 'bg-red-50 border-red-100' :
                    rec.priority === 'medium' ? 'bg-amber-50 border-amber-100' :
                    'bg-blue-50 border-blue-100'
                  }`}>
                    <div className="flex items-start gap-2">
                      <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${
                        rec.priority === 'high' ? 'text-red-500' :
                        rec.priority === 'medium' ? 'text-amber-500' : 'text-blue-500'
                      }`} />
                      <div>
                        <p className="text-xs font-semibold text-gray-800">{rec.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{rec.description}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {rec.targetZones.map((zone, i) => (
                            <span key={i} className="px-2 py-0.5 bg-white/80 rounded text-[10px] text-gray-600">
                              {zone}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
          </div>
        </div>
      </div>
    </div>
  );
}
