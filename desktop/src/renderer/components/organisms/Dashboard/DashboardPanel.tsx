import { FileText, CheckSquare, Scale, ListTodo, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardData } from './useDashboardData';
import { DashboardSkeleton } from './DashboardSkeleton';
import { StatCard } from './StatCard';
import { ProgressCard } from './ProgressCard';
import { RecentActivity } from './RecentActivity';
import { HealthCheck } from './HealthCheck';
import { TaskBreakdown } from './TaskBreakdown';
import type { DashboardPanelProps } from './types';

export function DashboardPanel({ projectPath }: DashboardPanelProps) {
  const {
    isLoading,
    isRefreshing,
    health,
    stats,
    recentActivity,
    handleRefresh,
  } = useDashboardData(projectPath);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="h-full overflow-auto bg-[#0a0a0f] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Dashboard</h1>
          <p className="text-sm text-gray-500">Project overview and health status</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={cn('w-5 h-5', isRefreshing && 'animate-spin')} />
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard
          title="User Stories"
          value={stats.stories}
          subtitle="Requirements defined"
          icon={<ListTodo className="w-5 h-5 text-blue-400" />}
          color="bg-blue-500/10"
        />
        <StatCard
          title="Tasks"
          value={stats.tasks}
          subtitle={`${stats.completedTasks} completed`}
          icon={<CheckSquare className="w-5 h-5 text-green-400" />}
          color="bg-green-500/10"
        />
        <StatCard
          title="Decisions"
          value={stats.decisions}
          subtitle="ADRs documented"
          icon={<Scale className="w-5 h-5 text-amber-400" />}
          color="bg-amber-500/10"
        />
        <StatCard
          title="Specs"
          value={stats.specs}
          subtitle="Specifications"
          icon={<FileText className="w-5 h-5 text-purple-400" />}
          color="bg-purple-500/10"
        />
      </div>

      {/* Progress Bar */}
      <ProgressCard
        progress={stats.progress}
        completedTasks={stats.completedTasks}
        inProgressTasks={stats.inProgressTasks}
        pendingTasks={stats.pendingTasks}
      />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity activities={recentActivity} />
        <HealthCheck health={health} blockedTasks={stats.blockedTasks} />
      </div>

      {/* Task Breakdown */}
      <TaskBreakdown
        pendingTasks={stats.pendingTasks}
        inProgressTasks={stats.inProgressTasks}
        completedTasks={stats.completedTasks}
        blockedTasks={stats.blockedTasks}
      />
    </div>
  );
}
