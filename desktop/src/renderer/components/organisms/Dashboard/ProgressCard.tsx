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
  const isComplete = progress >= 100;

  return (
    <div className="bg-[#1a1a24] rounded-lg border border-white/10 p-4 mb-6 transition-all duration-300 hover:border-white/15">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white">Overall Progress</h3>
        <span className={`text-lg font-bold transition-colors ${isComplete ? 'text-green-400' : 'text-purple-400'}`}>
          {progress}%
        </span>
      </div>
      <div className="h-3 bg-[#0a0a0f] rounded-full overflow-hidden relative">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out relative ${
            isComplete
              ? 'bg-gradient-to-r from-green-500 to-emerald-400'
              : 'bg-gradient-to-r from-purple-600 via-purple-500 to-purple-400'
          }`}
          style={{ width: `${progress}%` }}
        >
          {/* Shimmer effect on progress bar */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-gray-400">{completedTasks} completed</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-gray-400">{inProgressTasks} in progress</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-gray-500" />
          <span className="text-gray-400">{pendingTasks} pending</span>
        </span>
      </div>
    </div>
  );
}
