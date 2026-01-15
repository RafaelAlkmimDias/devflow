import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/api';

/**
 * Autopilot Store - Desktop version
 * Uses IPC to execute agents via Claude CLI
 */

export type AgentId = 'strategist' | 'architect' | 'builder' | 'guardian' | 'chronicler';
export type PhaseStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type RunStatus = 'idle' | 'running' | 'completed' | 'failed';

export interface PhaseResult {
  agent: AgentId;
  name: string;
  status: PhaseStatus;
  output?: string;
  error?: string;
  duration?: number;
}

export interface AutopilotConfig {
  phases: AgentId[];
}

// Default phases
export const DEFAULT_PHASES: { id: AgentId; name: string }[] = [
  { id: 'strategist', name: 'Planning' },
  { id: 'architect', name: 'Design' },
  { id: 'builder', name: 'Implementation' },
  { id: 'guardian', name: 'Validation' },
  { id: 'chronicler', name: 'Documentation' },
];

export const DEFAULT_CONFIG: AutopilotConfig = {
  phases: ['strategist', 'architect', 'builder', 'guardian', 'chronicler'],
};

interface AutopilotState {
  // State
  status: RunStatus;
  currentPhaseIndex: number;
  phases: PhaseResult[];
  error: string | null;
  specId: string | null;
  specTitle: string | null;

  // Config modal
  isConfigModalOpen: boolean;
  selectedSpecId: string | null;
  selectedSpecTitle: string | null;
  selectedSpecContent: string | null;

  // Actions
  openConfigModal: (specId: string, specTitle: string, specContent: string) => void;
  closeConfigModal: () => void;
  startRun: (config: AutopilotConfig, projectPath: string) => Promise<void>;
  reset: () => void;
}

export const useAutopilotStore = create<AutopilotState>()(
  persist(
    (set, get) => ({
      status: 'idle',
      currentPhaseIndex: -1,
      phases: [],
      error: null,
      specId: null,
      specTitle: null,
      isConfigModalOpen: false,
      selectedSpecId: null,
      selectedSpecTitle: null,
      selectedSpecContent: null,

      openConfigModal: (specId, specTitle, specContent) => {
        set({
          isConfigModalOpen: true,
          selectedSpecId: specId,
          selectedSpecTitle: specTitle,
          selectedSpecContent: specContent,
        });
      },

      closeConfigModal: () => {
        set({
          isConfigModalOpen: false,
          selectedSpecId: null,
          selectedSpecTitle: null,
          selectedSpecContent: null,
        });
      },

      startRun: async (config, projectPath) => {
        const { selectedSpecId, selectedSpecTitle, selectedSpecContent } = get();

        if (!selectedSpecId || !selectedSpecTitle || !selectedSpecContent) {
          throw new Error('No spec selected');
        }

        // Initialize phases
        const initialPhases: PhaseResult[] = config.phases.map((agentId) => {
          const phaseInfo = DEFAULT_PHASES.find((p) => p.id === agentId);
          return {
            agent: agentId,
            name: phaseInfo?.name || agentId,
            status: 'pending',
          };
        });

        set({
          status: 'running',
          currentPhaseIndex: 0,
          phases: initialPhases,
          error: null,
          specId: selectedSpecId,
          specTitle: selectedSpecTitle,
          isConfigModalOpen: false,
        });

        // Execute phases sequentially
        let previousOutputs: string[] = [];

        for (let i = 0; i < config.phases.length; i++) {
          const agentId = config.phases[i];

          // Update current phase to running
          set((state) => ({
            currentPhaseIndex: i,
            phases: state.phases.map((p, idx) =>
              idx === i ? { ...p, status: 'running' } : p
            ),
          }));

          const startTime = Date.now();

          try {
            // Build prompt with spec content and previous outputs
            const prompt = buildAgentPrompt(agentId, selectedSpecContent, previousOutputs);

            // Execute agent via IPC
            const output = await api.executeAgent(agentId, prompt, projectPath);
            const duration = Date.now() - startTime;

            previousOutputs.push(output || '');

            // Update phase as completed
            set((state) => ({
              phases: state.phases.map((p, idx) =>
                idx === i
                  ? { ...p, status: 'completed', output, duration }
                  : p
              ),
            }));

          } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // Update phase as failed
            set((state) => ({
              status: 'failed',
              error: errorMessage,
              phases: state.phases.map((p, idx) =>
                idx === i
                  ? { ...p, status: 'failed', error: errorMessage, duration }
                  : idx > i
                  ? { ...p, status: 'skipped' }
                  : p
              ),
            }));

            return; // Stop execution
          }
        }

        // All phases completed
        set({ status: 'completed' });
      },

      reset: () => {
        set({
          status: 'idle',
          currentPhaseIndex: -1,
          phases: [],
          error: null,
          specId: null,
          specTitle: null,
          isConfigModalOpen: false,
          selectedSpecId: null,
          selectedSpecTitle: null,
          selectedSpecContent: null,
        });
      },
    }),
    {
      name: 'devflow-autopilot',
      partialize: (state) => ({
        status: state.status,
        phases: state.phases,
        specId: state.specId,
        specTitle: state.specTitle,
      }),
    }
  )
);

// Helper to build prompts for each agent
function buildAgentPrompt(agent: AgentId, specContent: string, previousOutputs: string[]): string {
  const context = previousOutputs.length > 0
    ? `\n\nPrevious phases output:\n${previousOutputs.join('\n---\n')}`
    : '';

  const prompts: Record<AgentId, string> = {
    strategist: `As the Strategist agent, analyze this spec and refine the requirements:

${specContent}
${context}

Focus on:
- Validating acceptance criteria
- Identifying edge cases
- Clarifying ambiguities`,

    architect: `As the Architect agent, design the technical solution:

${specContent}
${context}

Focus on:
- System design decisions
- Component architecture
- Integration points
- Technical constraints`,

    builder: `As the Builder agent, implement the solution:

${specContent}
${context}

Focus on:
- Writing clean, tested code
- Following project conventions
- Implementing all requirements`,

    guardian: `As the Guardian agent, validate the implementation:

${specContent}
${context}

Focus on:
- Code review
- Security analysis
- Performance considerations
- Best practices`,

    chronicler: `As the Chronicler agent, update documentation:

${specContent}
${context}

Focus on:
- Updating relevant docs
- Recording decisions
- Maintaining knowledge graph`,
  };

  return prompts[agent];
}
