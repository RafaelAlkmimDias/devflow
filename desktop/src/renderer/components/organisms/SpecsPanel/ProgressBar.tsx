import { cn } from '@/lib/utils';
import type { SpecProgress } from '@/lib/stores/specsStore';

interface ProgressBarProps {
  progress: SpecProgress;
}

export function ProgressBar({ progress }: ProgressBarProps) {
  if (progress.total === 0) return null;

  const getBarColor = () => {
    if (progress.status === 'completed') return 'bg-green-500';
    if (progress.percentage >= 50) return 'bg-blue-500';
    return 'bg-amber-500';
  };

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
        <span>{progress.completed}/{progress.total} tasks</span>
        <span className={cn(
          progress.status === 'completed' && 'text-green-400',
          progress.status === 'in_progress' && 'text-blue-400'
        )}>
          {progress.percentage}%
        </span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-300', getBarColor())}
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
    </div>
  );
}
