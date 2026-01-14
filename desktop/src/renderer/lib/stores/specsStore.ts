import { create } from 'zustand';
import type { Spec, Requirement, DesignDecision, Task, SpecPhase } from '@/lib/types';
import { api } from '@/api';

// Progress info for a spec
export interface SpecProgress {
  total: number;
  completed: number;
  inProgress: number;
  percentage: number;
  status: 'not_started' | 'in_progress' | 'completed';
}

interface SpecsState {
  // State
  specs: Spec[];
  requirements: Requirement[];
  decisions: DesignDecision[];
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  selectedSpecId: string | null;
  activePhase: SpecPhase;

  // Actions
  loadSpecs: (projectPath: string) => Promise<void>;
  setSelectedSpec: (id: string | null) => void;
  setActivePhase: (phase: SpecPhase) => void;
  updateTaskStatus: (taskId: string, status: Task['status']) => void;
  getSpecsByPhase: (phase: SpecPhase) => Spec[];
  getRequirementsBySpec: (specId: string) => Requirement[];
  getTasksBySpec: (specId: string) => Task[];
  getDecisionsBySpec: (specId: string) => DesignDecision[];
  getSpecProgress: (specId: string) => SpecProgress;
}

export const useSpecsStore = create<SpecsState>((set, get) => ({
  specs: [],
  requirements: [],
  decisions: [],
  tasks: [],
  isLoading: false,
  error: null,
  selectedSpecId: null,
  activePhase: 'requirements',

  loadSpecs: async (projectPath: string) => {
    set({ isLoading: true, error: null });

    try {
      // Load specs from the .devflow/specs directory
      const specsPath = `${projectPath}/.devflow/specs`;
      const specsData = await api.parseSpecs(specsPath);

      // Transform spec data into our types
      const specs: Spec[] = specsData.map(spec => ({
        id: spec.id,
        name: spec.title,
        description: spec.content.substring(0, 200),
        phase: 'requirements' as SpecPhase,
        status: spec.status as 'draft' | 'approved' | 'implemented',
        createdAt: new Date(),
        updatedAt: new Date(),
        filePath: `${specsPath}/${spec.id}.md`,
      }));

      // Extract tasks from specs
      const tasks: Task[] = specsData.flatMap(spec =>
        spec.tasks.map((task, index) => ({
          id: `${spec.id}-task-${index}`,
          specId: spec.id,
          filePath: `${specsPath}/${spec.id}.md`,
          title: task.text,
          description: '',
          status: task.completed ? 'completed' as const : 'pending' as const,
          priority: 'medium' as const,
          dependencies: [],
          createdAt: new Date(),
        }))
      );

      set({
        specs,
        tasks,
        requirements: [],
        decisions: [],
        isLoading: false,
      });
    } catch (error) {
      console.error('Error loading specs:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load specs',
        isLoading: false,
        specs: [],
        tasks: [],
      });
    }
  },

  setSelectedSpec: (id: string | null) => {
    set({ selectedSpecId: id });
  },

  setActivePhase: (phase: SpecPhase) => {
    set({ activePhase: phase });
  },

  updateTaskStatus: (taskId: string, status: Task['status']) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status,
              completedAt: status === 'completed' ? new Date() : undefined,
            }
          : t
      ),
    }));
  },

  getSpecsByPhase: (phase: SpecPhase) => {
    const { specs } = get();
    return specs.filter((spec) => spec.phase === phase);
  },

  getRequirementsBySpec: (specId: string) => {
    const { requirements } = get();
    return requirements.filter((req) => req.specId === specId);
  },

  getTasksBySpec: (specId: string) => {
    const { tasks } = get();
    return tasks.filter((task) => task.specId === specId);
  },

  getDecisionsBySpec: (specId: string) => {
    const { decisions } = get();
    return decisions.filter((dec) => dec.specId === specId);
  },

  getSpecProgress: (specId: string) => {
    const { tasks } = get();
    const specTasks = tasks.filter((task) => task.specId === specId);

    if (specTasks.length === 0) {
      return {
        total: 0,
        completed: 0,
        inProgress: 0,
        percentage: 0,
        status: 'not_started' as const,
      };
    }

    const completed = specTasks.filter((t) => t.status === 'completed').length;
    const inProgress = specTasks.filter((t) => t.status === 'in_progress').length;
    const total = specTasks.length;
    const percentage = Math.round((completed / total) * 100);

    let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
    if (completed === total) {
      status = 'completed';
    } else if (completed > 0 || inProgress > 0) {
      status = 'in_progress';
    }

    return { total, completed, inProgress, percentage, status };
  },
}));
