import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProjectInfo } from '@/lib/types';
import { projectApi } from '@/infrastructure/api';

interface RecentProject {
  path: string;
  name: string;
  lastOpened: Date;
}

interface ProjectHealth {
  claudeCli: { installed: boolean; version?: string };
}

interface ProjectState {
  // State
  currentProject: ProjectInfo | null;
  recentProjects: RecentProject[];
  isLoading: boolean;
  error: string | null;
  health: ProjectHealth | null;

  // Actions
  openProject: (path: string) => Promise<void>;
  setProject: (project: Partial<ProjectInfo>) => void;
  closeProject: () => void;
  setError: (error: string | null) => void;
  selectProjectDialog: () => Promise<string | null>;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      currentProject: null,
      recentProjects: [],
      isLoading: false,
      error: null,
      health: { claudeCli: { installed: true } },

      setProject: (project: Partial<ProjectInfo>) => {
        const current = get().currentProject;
        const newProject: ProjectInfo = {
          path: project.path || current?.path || '',
          name: project.name || current?.name || '',
          isValid: project.isValid ?? current?.isValid ?? true,
          hasDevflow: project.hasDevflow ?? current?.hasDevflow ?? false,
          hasClaudeProject: project.hasClaudeProject ?? current?.hasClaudeProject ?? false,
          stats: project.stats || current?.stats || { specs: 0, stories: 0, adrs: 0, agents: 0 },
        };
        set({ currentProject: newProject });
      },

      openProject: async (path: string) => {
        set({ isLoading: true, error: null });

        try {
          // Get project name from path
          const name = path.split('/').pop() || path;

          const project: ProjectInfo = {
            path,
            name,
            isValid: true,
            hasDevflow: false, // Will be determined by checking for .devflow folder
            hasClaudeProject: false, // Will be determined by checking for .claude folder
            stats: {
              specs: 0,
              stories: 0,
              adrs: 0,
              agents: 0,
            },
          };

          // Update recent projects
          const recentProjects = get().recentProjects.filter(
            (p) => p.path !== path
          );
          recentProjects.unshift({
            path,
            name: project.name,
            lastOpened: new Date(),
          });

          // Keep only last 10
          if (recentProjects.length > 10) {
            recentProjects.pop();
          }

          // Also add to Electron's recent projects
          await projectApi.addRecentProject(path);

          set({
            currentProject: project,
            recentProjects,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false,
          });
        }
      },

      closeProject: () => {
        set({
          currentProject: null,
          error: null,
        });
      },

      setError: (error) => {
        set({ error });
      },

      selectProjectDialog: async () => {
        try {
          const path = await projectApi.selectDirectory();
          return path;
        } catch (error) {
          console.error('Failed to open directory dialog:', error);
          return null;
        }
      },
    }),
    {
      name: 'devflow-project-store',
      partialize: (state) => ({
        recentProjects: state.recentProjects,
      }),
    }
  )
);
