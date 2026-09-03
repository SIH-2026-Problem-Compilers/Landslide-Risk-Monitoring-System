import type { RiskLevel, AlertSeverity } from '../../types';

const severityStyles: Record<string, { bg: string; text: string; dot: string }> = {
  low: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  moderate: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  severe: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  info: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  warning: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  critical: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  emergency: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
};

interface SeverityBadgeProps {
  severity: RiskLevel | AlertSeverity;
  size?: 'sm' | 'md';
}

export function SeverityBadge({ severity, size = 'md' }: SeverityBadgeProps) {
  const styles = severityStyles[severity] || severityStyles.low;
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full capitalize ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs'
      } ${styles.bg} ${styles.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
      {severity}
    </span>
  );
}

interface StatusBadgeProps {
  status: string;
}

const statusStyles: Record<string, { bg: string; text: string }> = {
  active: { bg: 'bg-red-50', text: 'text-red-700' },
  acknowledged: { bg: 'bg-blue-50', text: 'text-blue-700' },
  resolved: { bg: 'bg-green-50', text: 'text-green-700' },
  archived: { bg: 'bg-gray-50', text: 'text-gray-700' },
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
  verified: { bg: 'bg-blue-50', text: 'text-blue-700' },
  investigating: { bg: 'bg-purple-50', text: 'text-purple-700' },
  dismissed: { bg: 'bg-gray-50', text: 'text-gray-700' },
  online: { bg: 'bg-green-50', text: 'text-green-700' },
  offline: { bg: 'bg-red-50', text: 'text-red-700' },
  warning: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
  maintenance: { bg: 'bg-blue-50', text: 'text-blue-700' },
  open: { bg: 'bg-green-50', text: 'text-green-700' },
  partially_blocked: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
  fully_blocked: { bg: 'bg-red-50', text: 'text-red-700' },
  sent: { bg: 'bg-blue-50', text: 'text-blue-700' },
  delivered: { bg: 'bg-green-50', text: 'text-green-700' },
  partial: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
  failed: { bg: 'bg-red-50', text: 'text-red-700' },
  idle: { bg: 'bg-gray-50', text: 'text-gray-700' },
  processing: { bg: 'bg-blue-50', text: 'text-blue-700' },
  completed: { bg: 'bg-green-50', text: 'text-green-700' },
  error: { bg: 'bg-red-50', text: 'text-red-700' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles = statusStyles[status] || statusStyles.pending;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${styles.bg} ${styles.text}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
