import { cn } from '@/lib/utils';
import type { Task } from '@/lib/types';
import { TaskCard } from './TaskCard';

interface TaskGroupProps {
  title: string;
  tasks: Task[];
  color: string;
  onToggle: (task: Task, currentStatus: Task['status']) => void;
  onViewFile: (filePath: string) => void;
}

export function TaskGroup({
  title,
  tasks,
  color,
  onToggle,
  onViewFile,
}: TaskGroupProps) {
  return (
    <div>
      <h3 className={cn('text-xs font-medium mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2', color)}>
        <span className="truncate">{title}</span>
        <span className="flex-shrink-0 px-1.5 py-0.5 bg-white/10 rounded text-[10px]">{tasks.length}</span>
      </h3>
      <div className="space-y-1.5 sm:space-y-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onToggle={() => onToggle(task, task.status)}
            onViewFile={onViewFile}
          />
        ))}
      </div>
    </div>
  );
}
