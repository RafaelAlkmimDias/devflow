import { useEffect, useState, useMemo, useCallback } from 'react';
import { CheckCircle2, Clock, FileText, Scale } from 'lucide-react';
import { useSpecsStore } from '@/lib/stores/specsStore';
import { devflowApi, requirementsApi } from '@/infrastructure/api';
import type { HealthStatus, DashboardStats, ActivityItem } from './types';

export function useDashboardData(projectPath: string) {
  const { specs, requirements, decisions, tasks, isLoading, loadSpecs } = useSpecsStore();
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch health status via IPC
  const fetchHealth = useCallback(async (path: string) => {
    try {
      const devflowStatus = await devflowApi.check(path);
      const requirementsStatus = await requirementsApi.check();

      const claudeReq = requirementsStatus.requirements.find(r => r.id === 'claude');

      setHealth({
        claudeCli: {
          installed: claudeReq?.status === 'installed',
          authenticated: true,
          version: claudeReq?.version,
        },
        project: {
          valid: true,
          hasDevflow: devflowStatus.hasDevflowFolder,
          hasClaudeProject: devflowStatus.hasAgents,
        },
      });
    } catch (error) {
      console.error('Failed to fetch health:', error);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    if (projectPath) {
      loadSpecs(projectPath);
      fetchHealth(projectPath);
    }
  }, [projectPath, loadSpecs, fetchHealth]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([loadSpecs(projectPath), fetchHealth(projectPath)]);
    setIsRefreshing(false);
  }, [projectPath, loadSpecs, fetchHealth]);

  // Calculate stats
  const stats: DashboardStats = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const pendingTasks = tasks.filter(t => t.status === 'pending').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    const blockedTasks = tasks.filter(t => t.status === 'blocked').length;

    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      stories: requirements.length,
      tasks: totalTasks,
      completedTasks,
      pendingTasks,
      inProgressTasks,
      blockedTasks,
      decisions: decisions.length,
      specs: specs.length,
      progress,
    };
  }, [specs, requirements, decisions, tasks]);

  // Recent activity
  const recentActivity: ActivityItem[] = useMemo(() => {
    const activities: ActivityItem[] = [];

    const completed = tasks.filter(t => t.status === 'completed').slice(0, 2);
    completed.forEach(t => {
      activities.push({
        icon: CheckCircle2,
        text: `Task completed: ${t.title.slice(0, 30)}${t.title.length > 30 ? '...' : ''}`,
        time: 'Recently',
        color: 'text-green-400',
      });
    });

    const inProgress = tasks.filter(t => t.status === 'in_progress').slice(0, 2);
    inProgress.forEach(t => {
      activities.push({
        icon: Clock,
        text: `In progress: ${t.title.slice(0, 30)}${t.title.length > 30 ? '...' : ''}`,
        time: 'Active',
        color: 'text-blue-400',
      });
    });

    if (requirements.length > 0) {
      activities.push({
        icon: FileText,
        text: `${requirements.length} user stories loaded`,
        time: 'Project',
        color: 'text-purple-400',
      });
    }

    if (decisions.length > 0) {
      activities.push({
        icon: Scale,
        text: `${decisions.length} ADRs documented`,
        time: 'Project',
        color: 'text-amber-400',
      });
    }

    return activities.slice(0, 5);
  }, [tasks, requirements, decisions]);

  return {
    isLoading,
    isRefreshing,
    health,
    stats,
    recentActivity,
    handleRefresh,
  };
}
