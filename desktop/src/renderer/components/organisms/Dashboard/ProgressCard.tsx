interface ProgressCardProps {
  progress: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
}

export function ProgressCard({
  progress,
  completedTasks,
  inProgressTasks,
  pendingTasks,
}: ProgressCardProps) {
  return (
    <div className="bg-[#1a1a24] rounded-lg border border-white/10 p-4 mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-white">Overall Progress</h3>
        <span className="text-sm font-bold text-purple-400">{progress}%</span>
      </div>
      <div className="h-3 bg-[#0a0a0f] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
        <span>{completedTasks} completed</span>
        <span>{inProgressTasks} in progress</span>
        <span>{pendingTasks} pending</span>
      </div>
    </div>
  );
}
