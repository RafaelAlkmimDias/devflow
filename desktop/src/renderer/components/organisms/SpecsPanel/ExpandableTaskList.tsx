import { useState } from 'react';
import { CheckCircle2, Circle, ChevronDown, Rocket, Check, Ban, Undo2, ShieldBan } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAutopilotStore } from '@/lib/stores/autopilotStore';
import { useSpecsStore } from '@/lib/stores/specsStore';
import type { Task, Spec } from '@/lib/types';
import type { SpecProgress } from '@/lib/stores/specsStore';
import { ProgressBar } from './ProgressBar';

interface ExpandableTaskListProps {
  tasks: Task[];
  spec?: Spec;
  progress: SpecProgress;
  parentTitle: string;
  parentContext: string;
}

export function ExpandableTaskList({
  tasks,
  spec,
  progress,
  parentTitle,
  parentContext,
}: ExpandableTaskListProps) {
  const [expanded, setExpanded] = useState(false);
  const { openConfigModal, status: autopilotStatus, specId: autopilotSpecId } = useAutopilotStore();
  const { updateTaskStatusWithPersist } = useSpecsStore();
  const isAutopilotRunning = autopilotStatus === 'running' && autopilotSpecId === spec?.id;

  if (progress.total === 0) {
    return null;
  }

  const handleTaskAutopilot = (task: Task) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (spec) {
      const taskContent = `# ${parentTitle}\n\n## Task\n${task.title}\n\n## Context\n${parentContext}`;
      const taskSpecId = `${spec.id}:task:${task.id}`;
      openConfigModal(taskSpecId, task.title, taskContent);
    }
  };

  const handleManualDone = (task: Task) => async (e: React.MouseEvent) => {
    e.stopPropagation();
    await updateTaskStatusWithPersist(task.id, 'completed');
  };

  const handleBlock = (task: Task) => async (e: React.MouseEvent) => {
    e.stopPropagation();
    await updateTaskStatusWithPersist(task.id, 'blocked');
  };

  const handleRestore = (task: Task) => async (e: React.MouseEvent) => {
    e.stopPropagation();
    await updateTaskStatusWithPersist(task.id, 'pending');
  };

  return (
    <div className="mt-2">
      <div className="flex items-center gap-1">
        <div className="flex-1">
          <ProgressBar progress={progress} />
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="flex-shrink-0 p-0.5 rounded hover:bg-white/10 transition-colors text-gray-500 hover:text-gray-300"
          aria-label={expanded ? 'Collapse tasks' : 'Expand tasks'}
        >
          <ChevronDown
            className={cn('w-3.5 h-3.5 transition-transform', expanded && 'rotate-180')}
          />
        </button>
      </div>

      {expanded && tasks.length > 0 && (
        <div className="mt-2 space-y-1 border-t border-white/5 pt-2">
          {[...tasks].sort((a, b) => {
            const order = { pending: 0, in_progress: 0, blocked: 2, completed: 1 };
            return (order[a.status] ?? 0) - (order[b.status] ?? 0);
          }).map((task) => {
            const isTaskDone = task.status === 'completed';
            const isTaskBlocked = task.status === 'blocked';
            const isPending = !isTaskDone && !isTaskBlocked;
            return (
              <div
                key={task.id}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs group',
                  isTaskDone && 'bg-green-500/5 text-gray-500',
                  isTaskBlocked && 'bg-red-500/5 text-gray-600',
                  isPending && 'bg-white/[0.03] text-gray-300'
                )}
              >
                {isTaskDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-green-500" />
                ) : isTaskBlocked ? (
                  <Ban className="w-3.5 h-3.5 flex-shrink-0 text-red-500/60" />
                ) : (
                  <Circle className="w-3.5 h-3.5 flex-shrink-0 text-gray-500" />
                )}
                <span className={cn(
                  'flex-1',
                  isTaskDone && 'line-through text-gray-600',
                  isTaskBlocked && 'line-through text-gray-700'
                )}>
                  {task.title}
                </span>

                {/* Action buttons for pending tasks */}
                {isPending && spec && (
                  <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Mark as done manually */}
                    <button
                      onClick={handleManualDone(task)}
                      title="Marcar como feito manualmente"
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] transition-all text-gray-500 hover:bg-green-500/20 hover:text-green-400"
                    >
                      <Check className="w-2.5 h-2.5" />
                    </button>

                    {/* Block task */}
                    <button
                      onClick={handleBlock(task)}
                      title="Marcar como bloqueada"
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] transition-all text-gray-500 hover:bg-red-500/20 hover:text-red-400"
                    >
                      <ShieldBan className="w-2.5 h-2.5" />
                    </button>

                    {/* Autopilot */}
                    <button
                      onClick={handleTaskAutopilot(task)}
                      disabled={!!isAutopilotRunning}
                      title="Executar com Autopilot"
                      className={cn(
                        'flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] transition-all',
                        isAutopilotRunning
                          ? 'text-purple-400/50 cursor-wait'
                          : 'text-gray-500 hover:bg-purple-500/20 hover:text-purple-400'
                      )}
                    >
                      <Rocket className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}

                {/* Restore button for completed/blocked tasks */}
                {(isTaskDone || isTaskBlocked) && (
                  <button
                    onClick={handleRestore(task)}
                    title="Restaurar tarefa"
                    className="flex-shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] transition-all opacity-0 group-hover:opacity-100 text-gray-600 hover:bg-white/10 hover:text-gray-400"
                  >
                    <Undo2 className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
