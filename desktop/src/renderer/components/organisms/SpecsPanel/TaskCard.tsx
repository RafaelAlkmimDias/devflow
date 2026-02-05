import { CheckCircle2, Circle, Loader2, AlertCircle, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task } from '@/lib/types';

interface TaskCardProps {
  task: Task;
  onToggle: () => void;
  onViewFile: (filePath: string) => void;
}

const priorityDots = {
  low: 'bg-gray-400',
  medium: 'bg-blue-400',
  high: 'bg-amber-400',
  critical: 'bg-red-400',
};

const agentColors: Record<string, string> = {
  strategist: 'text-blue-400 bg-blue-400/10',
  architect: 'text-cyan-400 bg-cyan-400/10',
  builder: 'text-amber-400 bg-amber-400/10',
  guardian: 'text-green-400 bg-green-400/10',
  chronicler: 'text-purple-400 bg-purple-400/10',
};

export function TaskCard({ task, onToggle, onViewFile }: TaskCardProps) {
  const isCompleted = task.status === 'completed';
  const isInProgress = task.status === 'in_progress';
  const isBlocked = task.status === 'blocked';

  const getStatusStyles = () => {
    if (isCompleted) return 'bg-green-500/5 border-green-500/20 hover:bg-green-500/10 hover:border-green-500/30';
    if (isInProgress) return 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/15 hover:border-blue-500/40 animate-pulse-glow';
    if (isBlocked) return 'bg-red-500/5 border-red-500/20 opacity-60 hover:opacity-80';
    return 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20 hover:shadow-lg hover:shadow-black/20';
  };

  const handleViewFile = () => {
    if (task.filePath) {
      onViewFile(task.filePath);
    }
  };

  return (
    <div
      className={cn(
        'p-2 sm:p-3 border rounded-lg transition-all duration-200 group card-interactive',
        getStatusStyles()
      )}
    >
      <div className="flex items-start gap-2 sm:gap-3">
        <button
          onClick={onToggle}
          className="mt-0.5 flex-shrink-0"
          title={isCompleted ? 'Marcar como pendente' : 'Marcar como concluído'}
        >
          {isCompleted ? (
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          ) : isInProgress ? (
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
          ) : isBlocked ? (
            <AlertCircle className="w-4 h-4 text-red-400" />
          ) : (
            <Circle className="w-4 h-4 text-gray-500 hover:text-white transition-colors" />
          )}
        </button>
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className={cn('w-2 h-2 rounded-full flex-shrink-0', priorityDots[task.priority])} />
            <span className={cn(
              'font-medium text-sm break-words line-clamp-2',
              isCompleted ? 'line-through text-gray-500' : 'text-white'
            )}>
              {task.title}
            </span>
          </div>
          {task.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-1 break-words">{task.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {isInProgress && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                In Progress
              </span>
            )}
            {isBlocked && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                Blocked
              </span>
            )}
            {isCompleted && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                Done
              </span>
            )}
            {task.status === 'pending' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400">
                Pending
              </span>
            )}
            {task.assignedAgent && (
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full',
                agentColors[task.assignedAgent] || 'text-gray-400 bg-gray-400/10'
              )}>
                @{task.assignedAgent}
              </span>
            )}
          </div>
        </div>
        {/* View file button */}
        {task.filePath && (
          <button
            onClick={handleViewFile}
            className="flex-shrink-0 p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-500 hover:text-white opacity-0 group-hover:opacity-100"
            title="Ver arquivo markdown"
          >
            <Eye className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
