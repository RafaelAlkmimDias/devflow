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
      // Load specs from all project directories (docs/planning, docs/decisions, etc.)
      const specsData = await api.parseSpecs(projectPath);

      // Separate by type
      const specs: Spec[] = [];
      const requirements: Requirement[] = [];
      const decisions: DesignDecision[] = [];
      const tasks: Task[] = [];

      for (const spec of specsData) {
        const specType = spec.metadata?.type as string || 'spec';
        const filePath = spec.metadata?.filePath as string || '';

        // Determine phase based on type
        let phase: SpecPhase = 'requirements';
        if (specType === 'adr') {
          phase = 'design';
        } else if (specType === 'spec' && !filePath.includes('stories')) {
          phase = 'design';
        }

        // Create base spec
        const baseSpec: Spec = {
          id: spec.id,
          name: spec.title,
          description: spec.content.substring(0, 200),
          phase,
          status: spec.status as 'draft' | 'approved' | 'implemented',
          createdAt: new Date(),
          updatedAt: new Date(),
          filePath: `${projectPath}/${filePath}`,
        };
        specs.push(baseSpec);

        // Create requirement for stories
        if (specType === 'story') {
          // Extract description: remove H1 line and take content until first ## section
          const descContent = spec.content
            .replace(/^#\s+.+\n*/, '')
            .split(/\n##\s/)[0]
            .split('\n')
            .filter(line => line.trim() !== '' && line.trim() !== '---')
            .join('\n')
            .trim();
          requirements.push({
            id: `req-${spec.id}`,
            specId: spec.id,
            title: spec.title,
            description: descContent.substring(0, 500),
            type: 'functional',
            priority: spec.priority as 'must' | 'should' | 'could' | 'wont' || 'should',
            acceptanceCriteria: spec.tasks.map(t => t.text),
            status: spec.status as 'draft' | 'approved' | 'implemented',
            filePath: `${projectPath}/${filePath}`,
          });
        }

        // Create decision for ADRs
        if (specType === 'adr') {
          decisions.push({
            id: `design-${spec.id}`,
            specId: spec.id,
            title: spec.title,
            context: spec.content.substring(0, 500),
            decision: '',
            consequences: [],
            status: spec.status === 'approved' ? 'accepted' : 'proposed',
            filePath: `${projectPath}/${filePath}`,
          });
        }

        // Extract tasks from spec
        spec.tasks.forEach((task, index) => {
          tasks.push({
            id: `${spec.id}-task-${index}`,
            specId: spec.id,
            filePath: `${projectPath}/${filePath}`,
            title: task.text,
            description: '',
            status: task.completed ? 'completed' as const : 'pending' as const,
            priority: 'medium' as const,
            dependencies: [],
            createdAt: new Date(),
            completedAt: task.completed ? new Date() : undefined,
          });
        });
      }

      set({
        specs,
        requirements,
        decisions,
        tasks,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error loading specs:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load specs',
        isLoading: false,
        specs: [],
        requirements: [],
        decisions: [],
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
