import { CheckSquare } from 'lucide-react';

interface TaskBreakdownProps {
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  blockedTasks: number;
}

export function TaskBreakdown({
  pendingTasks,
  inProgressTasks,
  completedTasks,
  blockedTasks,
}: TaskBreakdownProps) {
  return (
    <div className="mt-6 bg-[#1a1a24] rounded-lg border border-white/10 p-4">
      <div className="flex items-center gap-2 mb-4">
        <CheckSquare className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-medium text-white">Task Breakdown</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="text-center p-3 rounded-lg bg-gray-500/10">
          <p className="text-2xl font-bold text-gray-400">{pendingTasks}</p>
          <p className="text-xs text-gray-500">Pending</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-blue-500/10">
          <p className="text-2xl font-bold text-blue-400">{inProgressTasks}</p>
          <p className="text-xs text-gray-500">In Progress</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-green-500/10">
          <p className="text-2xl font-bold text-green-400">{completedTasks}</p>
          <p className="text-xs text-gray-500">Completed</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-red-500/10">
          <p className="text-2xl font-bold text-red-400">{blockedTasks}</p>
          <p className="text-xs text-gray-500">Blocked</p>
        </div>
      </div>
    </div>
  );
}
