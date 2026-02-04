import { Wifi } from 'lucide-react';
import { HealthItem } from './HealthItem';
import type { HealthStatus } from './types';

interface HealthCheckProps {
  health: HealthStatus | null;
  blockedTasks: number;
}

export function HealthCheck({ health, blockedTasks }: HealthCheckProps) {
  return (
    <div className="bg-[#1a1a24] rounded-lg border border-white/10 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Wifi className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-medium text-white">Health Check</h3>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2">
        <HealthItem
          label="Claude CLI"
          status={health?.claudeCli?.installed ? 'ok' : 'error'}
          message={health?.claudeCli?.version || 'Not detected'}
        />
        <HealthItem
          label="Project Structure"
          status={health?.project?.valid ? 'ok' : 'warning'}
          message={health?.project?.hasDevflow ? 'DevFlow configured' : 'No .devflow folder'}
        />
        <HealthItem
          label="Git Repository"
          status="ok"
          message="Connected"
        />
        {blockedTasks > 0 ? (
          <HealthItem
            label="Blocked Tasks"
            status="warning"
            message={`${blockedTasks} tasks need attention`}
          />
        ) : (
          <HealthItem
            label="No Blockers"
            status="ok"
            message="All tasks are progressing"
          />
        )}
      </div>
    </div>
  );
}
