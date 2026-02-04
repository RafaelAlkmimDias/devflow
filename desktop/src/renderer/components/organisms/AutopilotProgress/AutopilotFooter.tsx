import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutopilotFooterProps {
  elapsed: number;
  completedPhases: number;
  totalPhases: number;
  progress: number;
  isCompleted: boolean;
  isFailed: boolean;
}

export function AutopilotFooter({
  elapsed,
  completedPhases,
  totalPhases,
  progress,
  isCompleted,
  isFailed,
}: AutopilotFooterProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="px-4 py-3 border-t border-white/10 bg-white/5">
      <div className="flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTime(elapsed)}
          </span>
          <span>
            {completedPhases}/{totalPhases} phases
          </span>
        </div>
        <span className="text-purple-400 font-medium">{progress}%</span>
      </div>
      {/* Progress bar */}
      <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            isCompleted ? 'bg-green-500' : isFailed ? 'bg-red-500' : 'bg-purple-500'
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
