import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Autopilot Store - Versão simplificada
 * Execução sequencial sem streaming
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
  specContent: string | null;
  projectPath: string | null;

  // Config modal
  isConfigModalOpen: boolean;
  selectedSpecId: string | null;
  selectedSpecTitle: string | null;
  selectedSpecContent: string | null;

  // Actions
  openConfigModal: (specId: string, specTitle: string, specContent: string) => void;
  closeConfigModal: () => void;
  startRun: (config: AutopilotConfig, projectPath: string) => Promise<void>;
  continuePhase: (phaseIndex: number, userResponse: string) => Promise<void>;
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
      specContent: null,
      projectPath: null,
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
          specContent: selectedSpecContent,
          projectPath,
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
            const response = await fetch('/api/autopilot/execute', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                agent: agentId,
                specContent: selectedSpecContent,
                previousOutputs,
                projectPath,
              }),
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
              throw new Error(errorData.error || `Phase ${agentId} failed`);
            }

            const result = await response.json();
            const duration = Date.now() - startTime;

            previousOutputs.push(result.output || '');

            // Update phase as completed
            set((state) => ({
              phases: state.phases.map((p, idx) =>
                idx === i
                  ? { ...p, status: 'completed', output: result.output, duration }
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

      continuePhase: async (phaseIndex: number, userResponse: string) => {
        const { phases, specContent, projectPath, status } = get();

        if (!specContent || !projectPath) {
          throw new Error('No spec content or project path');
        }

        if (status === 'running') {
          throw new Error('Cannot continue while another phase is running');
        }

        const phase = phases[phaseIndex];
        if (!phase) {
          throw new Error('Phase not found');
        }

        // Set status to running and update the phase
        set({
          status: 'running',
          currentPhaseIndex: phaseIndex,
          error: null,
          phases: phases.map((p, idx) =>
            idx === phaseIndex ? { ...p, status: 'running' } : p
          ),
        });

        const startTime = Date.now();

        try {
          // Build previous outputs from phases before this one
          const previousOutputs: string[] = phases
            .filter((p, idx) => idx < phaseIndex && p.status === 'completed' && p.output)
            .map(p => p.output!);

          // Build continuation prompt
          const continuationPrompt = `Continue the analysis based on user feedback:

YOUR PREVIOUS OUTPUT:
${phase.output || ''}

USER RESPONSE:
${userResponse}

Please continue your analysis incorporating the user's feedback.`;

          const response = await fetch('/api/autopilot/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agent: phase.agent,
              specContent: specContent + '\n\n' + continuationPrompt,
              previousOutputs,
              projectPath,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `Continuation failed`);
          }

          const result = await response.json();
          const duration = Date.now() - startTime;

          // Append new output to existing output
          const combinedOutput = `${phase.output || ''}\n\n---\n[Sua resposta: ${userResponse}]\n---\n\n${result.output || ''}`;

          // Update phase as completed with combined output
          set((state) => ({
            status: 'completed',
            phases: state.phases.map((p, idx) =>
              idx === phaseIndex
                ? { ...p, status: 'completed', output: combinedOutput, duration: (p.duration || 0) + duration }
                : p
            ),
          }));

        } catch (error) {
          const duration = Date.now() - startTime;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          set((state) => ({
            status: 'failed',
            error: errorMessage,
            phases: state.phases.map((p, idx) =>
              idx === phaseIndex
                ? { ...p, status: 'failed', error: errorMessage, duration: (p.duration || 0) + duration }
                : p
            ),
          }));
        }
      },

      reset: () => {
        set({
          status: 'idle',
          currentPhaseIndex: -1,
          phases: [],
          error: null,
          specId: null,
          specTitle: null,
          specContent: null,
          projectPath: null,
          isConfigModalOpen: false,
          selectedSpecId: null,
          selectedSpecTitle: null,
          selectedSpecContent: null,
        });
      },
    }),
    {
      name: 'autopilot-storage',
      partialize: (state) => ({
        status: state.status,
        phases: state.phases,
        specId: state.specId,
        specTitle: state.specTitle,
        specContent: state.specContent,
        projectPath: state.projectPath,
      }),
    }
  )
);
