import { type LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  change?: number;
  changeLabel?: string;
}

export function StatCard({ title, value, icon: Icon, color, bgColor, change, changeLabel }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change !== undefined && (
            <p className={`text-xs mt-2 ${change >= 0 ? 'text-red-500' : 'text-green-500'}`}>
              {change >= 0 ? '+' : ''}{change}% {changeLabel || 'vs last week'}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${bgColor}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </div>
  );
}
