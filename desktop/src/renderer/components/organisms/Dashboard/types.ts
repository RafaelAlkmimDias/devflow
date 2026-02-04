export interface DashboardPanelProps {
  projectPath: string;
}

export interface HealthStatus {
  claudeCli: {
    installed: boolean;
    authenticated: boolean;
    version?: string;
  };
  project: {
    valid: boolean;
    hasDevflow: boolean;
    hasClaudeProject: boolean;
  };
}

export interface DashboardStats {
  stories: number;
  tasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  decisions: number;
  specs: number;
  progress: number;
}

export interface ActivityItem {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  time: string;
  color: string;
}
