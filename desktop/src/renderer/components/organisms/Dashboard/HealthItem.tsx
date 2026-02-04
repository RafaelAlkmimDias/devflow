import { CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HealthItemProps {
  label: string;
  status: 'ok' | 'warning' | 'error';
  message?: string;
}

const statusConfig = {
  ok: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
  warning: { icon: AlertCircle, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
};

export function HealthItem({ label, status, message }: HealthItemProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3 py-2">
      <div className={cn('p-1.5 rounded', config.bg)}>
        <Icon className={cn('w-4 h-4', config.color)} />
      </div>
      <div className="flex-1">
        <p className="text-sm text-white">{label}</p>
        {message && <p className="text-xs text-gray-500">{message}</p>}
      </div>
    </div>
  );
}
