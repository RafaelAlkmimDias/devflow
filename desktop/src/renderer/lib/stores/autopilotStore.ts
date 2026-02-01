import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/api';

/**
 * Autopilot Store - Desktop version
 * Uses IPC to execute agents via Claude CLI
 * Supports resuming interrupted runs
 */

export type AgentId = 'strategist' | 'architect' | 'builder' | 'guardian' | 'chronicler';
export type PhaseStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type RunStatus = 'idle' | 'running' | 'completed' | 'failed' | 'interrupted' | 'awaiting_input';

// Helper to detect if output ends with a question
function outputEndsWithQuestion(output: string): boolean {
  if (!output) return false;

  // Get the last meaningful lines (ignoring empty lines at the end)
  const lines = output.trim().split('\n').filter(line => line.trim());
  if (lines.length === 0) return false;

  // Get last 10 lines for analysis
  const lastLines = lines.slice(-10);
  const lastLinesText = lastLines.join('\n').toLowerCase();

  // Check if any of the last 5 lines ends with a question mark
  const lastFiveLines = lines.slice(-5);
  const hasQuestionMark = lastFiveLines.some(line => {
    const trimmed = line.trim();
    // Remove markdown formatting at the end
    const cleaned = trimmed.replace(/[\*_`]+$/, '').trim();
    return cleaned.endsWith('?');
  });

  if (hasQuestionMark) {
    console.log('[Autopilot] Question detected: line ends with ?');
    return true;
  }

  // Common question patterns in Portuguese and English
  const questionPatterns = [
    /deseja\s+(que|continuar|esclarecer|saber|algum)/i,
    /gostaria\s+(de|que)/i,
    /quer\s+(que|saber|algum)/i,
    /precisa\s+(de|que|algum)/i,
    /would\s+you\s+like/i,
    /do\s+you\s+want/i,
    /should\s+i/i,
    /shall\s+i/i,
    /can\s+i/i,
    /posso\s+(continuar|prosseguir|esclarecer|chamar)/i,
    /devo\s+(continuar|prosseguir)/i,
    /confirmar\s+(se|que|os|as)/i,
    /algum(a)?\s+(desses|dessas|dúvida|pergunta)/i,
    /esclareça\s+algum/i,
    /chamar\s+o\s+@/i,  // "chamar o @builder"
    /próximos?\s+passos?/i,  // Often ends with a question about next steps
  ];

  const hasQuestionPattern = questionPatterns.some(pattern => pattern.test(lastLinesText));

  if (hasQuestionPattern) {
    console.log('[Autopilot] Question detected: pattern match');
    return true;
  }

  return false;
}

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

// History of completed phases per spec
export interface SpecPhaseHistory {
  completedAt: string; // ISO date
  output?: string;
}

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

  // Live streaming log
  liveLog: string;

  // Config modal
  isConfigModalOpen: boolean;
  selectedSpecId: string | null;
  selectedSpecTitle: string | null;
  selectedSpecContent: string | null;

  // Pending phases to run (when paused for question)
  pendingPhasesConfig: AutopilotConfig | null;

  // History: tracks which agents have completed for each spec
  // Key: specId, Value: map of agentId -> history
  completedPhasesBySpec: Record<string, Record<AgentId, SpecPhaseHistory>>;

  // Actions
  openConfigModal: (specId: string, specTitle: string, specContent: string) => void;
  closeConfigModal: () => void;
  startRun: (config: AutopilotConfig, projectPath: string) => Promise<void>;
  resumeRun: () => Promise<void>;
  continuePhase: (phaseIndex: number, userResponse: string) => Promise<void>;
  skipToNextAgent: () => Promise<void>;
  runNextAgent: () => Promise<void>;
  getNextAgent: () => AgentId | null;
  reset: () => void;
  appendLog: (text: string) => void;
  clearLog: () => void;
  getCompletedPhasesForSpec: (specId: string) => Record<AgentId, SpecPhaseHistory>;
  clearHistoryForSpec: (specId: string) => void;
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
      liveLog: '',
      isConfigModalOpen: false,
      selectedSpecId: null,
      selectedSpecTitle: null,
      selectedSpecContent: null,
      pendingPhasesConfig: null,
      completedPhasesBySpec: {},

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
        const { selectedSpecId, selectedSpecTitle, selectedSpecContent, phases: existingPhases, specId: existingSpecId } = get();

        if (!selectedSpecId || !selectedSpecTitle || !selectedSpecContent) {
          throw new Error('No spec selected');
        }

        // Check if we're resuming the same spec with completed phases
        const isResumingSameSpec = existingSpecId === selectedSpecId && existingPhases.length > 0;

        // Initialize phases - preserve completed phases if resuming same spec
        const initialPhases: PhaseResult[] = config.phases.map((agentId) => {
          const phaseInfo = DEFAULT_PHASES.find((p) => p.id === agentId);

          // If resuming same spec, check if this phase was already completed
          if (isResumingSameSpec) {
            const existingPhase = existingPhases.find(p => p.agent === agentId);
            if (existingPhase && existingPhase.status === 'completed' && existingPhase.output) {
              return existingPhase; // Keep completed phase with its output
            }
          }

          return {
            agent: agentId,
            name: phaseInfo?.name || agentId,
            status: 'pending' as PhaseStatus,
          };
        });

        // Find first non-completed phase
        const startIndex = initialPhases.findIndex(p => p.status !== 'completed');

        set({
          status: 'running',
          currentPhaseIndex: startIndex >= 0 ? startIndex : 0,
          phases: initialPhases,
          error: null,
          specId: selectedSpecId,
          specTitle: selectedSpecTitle,
          specContent: selectedSpecContent,
          projectPath,
          isConfigModalOpen: false,
        });

        // Collect outputs from completed phases
        let previousOutputs: string[] = initialPhases
          .filter(p => p.status === 'completed' && p.output)
          .map(p => p.output!);

        // Execute remaining phases sequentially
        for (let i = startIndex >= 0 ? startIndex : 0; i < config.phases.length; i++) {
          const phase = initialPhases[i];

          // Skip already completed phases
          if (phase.status === 'completed') {
            continue;
          }

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

            // Check if output ends with a question - if so, pause for user input
            const hasQuestion = outputEndsWithQuestion(output || '');
            const isLastPhase = i === config.phases.length - 1;

            // Update phase as completed and save to history
            set((state) => {
              const newHistory = { ...state.completedPhasesBySpec };
              if (!newHistory[selectedSpecId]) {
                newHistory[selectedSpecId] = {} as Record<AgentId, SpecPhaseHistory>;
              }
              newHistory[selectedSpecId][agentId] = {
                completedAt: new Date().toISOString(),
                output: output?.substring(0, 500), // Save first 500 chars as preview
              };

              return {
                phases: state.phases.map((p, idx) =>
                  idx === i
                    ? { ...p, status: 'completed', output, duration }
                    : p
                ),
                completedPhasesBySpec: newHistory,
              };
            });

            // If output ends with question and there are more phases, pause for user input
            if (hasQuestion && !isLastPhase) {
              set({
                status: 'awaiting_input',
                pendingPhasesConfig: config,
              });
              return; // Stop execution, wait for user to respond or skip
            }

          } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // Update phase as failed but keep completed phases
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

      resumeRun: async () => {
        const { phases, specContent, projectPath, status, specId } = get();

        if (!specContent || !projectPath) {
          throw new Error('No spec content or project path to resume');
        }

        if (status !== 'interrupted' && status !== 'failed') {
          throw new Error('Can only resume interrupted or failed runs');
        }

        // Find first non-completed phase
        const startIndex = phases.findIndex(p => p.status !== 'completed');

        if (startIndex < 0) {
          set({ status: 'completed' });
          return;
        }

        set({
          status: 'running',
          currentPhaseIndex: startIndex,
          error: null,
        });

        // Collect outputs from completed phases
        let previousOutputs: string[] = phases
          .filter(p => p.status === 'completed' && p.output)
          .map(p => p.output!);

        // Execute remaining phases
        for (let i = startIndex; i < phases.length; i++) {
          const phase = phases[i];

          if (phase.status === 'completed') {
            continue;
          }

          const agentId = phase.agent;

          // Reset phase status and update to running
          set((state) => ({
            currentPhaseIndex: i,
            phases: state.phases.map((p, idx) =>
              idx === i ? { ...p, status: 'running', error: undefined } : p
            ),
          }));

          const startTime = Date.now();

          try {
            const prompt = buildAgentPrompt(agentId, specContent, previousOutputs);
            const output = await api.executeAgent(agentId, prompt, projectPath);
            const duration = Date.now() - startTime;

            previousOutputs.push(output || '');

            // Update phase as completed and save to history
            set((state) => {
              const newHistory = { ...state.completedPhasesBySpec };
              if (specId) {
                if (!newHistory[specId]) {
                  newHistory[specId] = {} as Record<AgentId, SpecPhaseHistory>;
                }
                newHistory[specId][agentId] = {
                  completedAt: new Date().toISOString(),
                  output: output?.substring(0, 500),
                };
              }

              return {
                phases: state.phases.map((p, idx) =>
                  idx === i
                    ? { ...p, status: 'completed', output, duration }
                    : p
                ),
                completedPhasesBySpec: newHistory,
              };
            });

          } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            set((state) => ({
              status: 'failed',
              error: errorMessage,
              phases: state.phases.map((p, idx) =>
                idx === i
                  ? { ...p, status: 'failed', error: errorMessage, duration }
                  : idx > i && p.status !== 'completed'
                  ? { ...p, status: 'skipped' }
                  : p
              ),
            }));

            return;
          }
        }

        set({ status: 'completed' });
      },

      continuePhase: async (phaseIndex: number, userResponse: string) => {
        const { phases, specContent, projectPath, status, specId } = get();

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
          // Build prompt with previous output and user response
          const previousOutputs: string[] = phases
            .filter((p, idx) => idx < phaseIndex && p.status === 'completed' && p.output)
            .map(p => p.output!);

          // Build continuation prompt
          const continuationPrompt = buildContinuationPrompt(
            phase.agent,
            specContent,
            previousOutputs,
            phase.output || '',
            userResponse
          );

          // Execute agent via IPC
          const newOutput = await api.executeAgent(phase.agent, continuationPrompt, projectPath);
          const duration = Date.now() - startTime;

          // Append new output to existing output
          const combinedOutput = `${phase.output || ''}\n\n---\n[Sua resposta: ${userResponse}]\n---\n\n${newOutput || ''}`;

          // Update phase as completed with combined output and save to history
          set((state) => {
            const newHistory = { ...state.completedPhasesBySpec };
            if (specId) {
              if (!newHistory[specId]) {
                newHistory[specId] = {} as Record<AgentId, SpecPhaseHistory>;
              }
              newHistory[specId][phase.agent] = {
                completedAt: new Date().toISOString(),
                output: combinedOutput?.substring(0, 500),
              };
            }

            return {
              status: 'completed',
              phases: state.phases.map((p, idx) =>
                idx === phaseIndex
                  ? { ...p, status: 'completed', output: combinedOutput, duration: (p.duration || 0) + duration }
                  : p
              ),
              completedPhasesBySpec: newHistory,
            };
          });

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
          liveLog: '',
          isConfigModalOpen: false,
          selectedSpecId: null,
          selectedSpecTitle: null,
          selectedSpecContent: null,
          pendingPhasesConfig: null,
        });
      },

      appendLog: (text: string) => {
        set((state) => ({
          liveLog: state.liveLog + text,
        }));
      },

      clearLog: () => {
        set({ liveLog: '' });
      },

      getCompletedPhasesForSpec: (specId: string) => {
        const { completedPhasesBySpec } = get();
        return completedPhasesBySpec[specId] || {};
      },

      getNextAgent: () => {
        const { phases } = get();

        // Get the last completed agent from the current run
        const completedAgents = phases
          .filter(p => p.status === 'completed')
          .map(p => p.agent);

        const lastCompletedAgent = completedAgents[completedAgents.length - 1];

        if (!lastCompletedAgent) {
          // No agent completed yet, return the first one
          return 'strategist';
        }

        // Find the index of the last completed agent in the default sequence
        const agentOrder: AgentId[] = ['strategist', 'architect', 'builder', 'guardian', 'chronicler'];
        const lastIndex = agentOrder.indexOf(lastCompletedAgent);

        // Get the next agent
        if (lastIndex < agentOrder.length - 1) {
          const nextAgent = agentOrder[lastIndex + 1];
          return nextAgent;
        }

        return null; // No more agents
      },

      // Skip responding to the question and continue to next agent
      skipToNextAgent: async () => {
        const { status, pendingPhasesConfig, specContent, projectPath, phases, specId } = get();

        if (status !== 'awaiting_input') {
          throw new Error('Not awaiting input');
        }

        if (!pendingPhasesConfig || !specContent || !projectPath) {
          throw new Error('No pending config or spec data');
        }

        // Find the next phase to run
        const completedCount = phases.filter(p => p.status === 'completed').length;
        const nextPhaseIndex = completedCount;

        if (nextPhaseIndex >= pendingPhasesConfig.phases.length) {
          // All phases completed
          set({ status: 'completed', pendingPhasesConfig: null });
          return;
        }

        // Continue execution from the next phase
        set({
          status: 'running',
          pendingPhasesConfig: null,
        });

        // Collect outputs from completed phases
        const previousOutputs = phases
          .filter(p => p.status === 'completed' && p.output)
          .map(p => p.output!);

        // Execute remaining phases
        for (let i = nextPhaseIndex; i < pendingPhasesConfig.phases.length; i++) {
          const agentId = pendingPhasesConfig.phases[i];
          const phaseInfo = DEFAULT_PHASES.find(p => p.id === agentId);

          // Check if phase already exists
          let phaseIndex = phases.findIndex(p => p.agent === agentId);
          if (phaseIndex < 0) {
            // Add new phase
            const newPhase: PhaseResult = {
              agent: agentId,
              name: phaseInfo?.name || agentId,
              status: 'running',
            };
            set((state) => ({
              currentPhaseIndex: state.phases.length,
              phases: [...state.phases, newPhase],
            }));
            phaseIndex = get().phases.length - 1;
          } else {
            // Update existing phase to running
            set((state) => ({
              currentPhaseIndex: phaseIndex,
              phases: state.phases.map((p, idx) =>
                idx === phaseIndex ? { ...p, status: 'running' } : p
              ),
            }));
          }

          const startTime = Date.now();

          try {
            const prompt = buildAgentPrompt(agentId, specContent, previousOutputs);
            const output = await api.executeAgent(agentId, prompt, projectPath);
            const duration = Date.now() - startTime;

            previousOutputs.push(output || '');

            // Check if output ends with a question
            const hasQuestion = outputEndsWithQuestion(output || '');
            const isLastPhase = i === pendingPhasesConfig.phases.length - 1;

            // Update phase as completed
            set((state) => {
              const newHistory = { ...state.completedPhasesBySpec };
              if (specId) {
                if (!newHistory[specId]) {
                  newHistory[specId] = {} as Record<AgentId, SpecPhaseHistory>;
                }
                newHistory[specId][agentId] = {
                  completedAt: new Date().toISOString(),
                  output: output?.substring(0, 500),
                };
              }

              return {
                phases: state.phases.map((p, idx) =>
                  idx === phaseIndex
                    ? { ...p, status: 'completed', output, duration }
                    : p
                ),
                completedPhasesBySpec: newHistory,
              };
            });

            // If output ends with question and there are more phases, pause
            if (hasQuestion && !isLastPhase) {
              set({
                status: 'awaiting_input',
                pendingPhasesConfig: pendingPhasesConfig,
              });
              return;
            }

          } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            set((state) => ({
              status: 'failed',
              error: errorMessage,
              phases: state.phases.map((p, idx) =>
                idx === phaseIndex
                  ? { ...p, status: 'failed', error: errorMessage, duration }
                  : p
              ),
            }));
            return;
          }
        }

        // All phases completed
        set({ status: 'completed', pendingPhasesConfig: null });
      },

      runNextAgent: async () => {
        const { specId, specContent, projectPath, phases, status } = get();

        if (!specId || !specContent || !projectPath) {
          throw new Error('No spec data available');
        }

        if (status === 'running') {
          throw new Error('Another agent is already running');
        }

        const nextAgent = get().getNextAgent();
        if (!nextAgent) {
          throw new Error('No more agents to run');
        }

        // Collect outputs from completed phases
        const previousOutputs = phases
          .filter(p => p.status === 'completed' && p.output)
          .map(p => p.output!);

        // Get phase info
        const phaseInfo = DEFAULT_PHASES.find(p => p.id === nextAgent);

        // Create new phase
        const newPhase: PhaseResult = {
          agent: nextAgent,
          name: phaseInfo?.name || nextAgent,
          status: 'running',
        };

        // Add to phases and set running
        set((state) => ({
          status: 'running',
          currentPhaseIndex: state.phases.length,
          phases: [...state.phases, newPhase],
          error: null,
        }));

        const startTime = Date.now();
        const phaseIndex = get().phases.length - 1;

        try {
          // Build prompt
          const prompt = buildAgentPrompt(nextAgent, specContent, previousOutputs);

          // Execute agent
          const output = await api.executeAgent(nextAgent, prompt, projectPath);
          const duration = Date.now() - startTime;

          // Update phase as completed and save to history
          set((state) => {
            const newHistory = { ...state.completedPhasesBySpec };
            if (specId) {
              if (!newHistory[specId]) {
                newHistory[specId] = {} as Record<AgentId, SpecPhaseHistory>;
              }
              newHistory[specId][nextAgent] = {
                completedAt: new Date().toISOString(),
                output: output?.substring(0, 500),
              };
            }

            return {
              status: 'completed',
              phases: state.phases.map((p, idx) =>
                idx === phaseIndex
                  ? { ...p, status: 'completed', output, duration }
                  : p
              ),
              completedPhasesBySpec: newHistory,
            };
          });

        } catch (error) {
          const duration = Date.now() - startTime;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          set((state) => ({
            status: 'failed',
            error: errorMessage,
            phases: state.phases.map((p, idx) =>
              idx === phaseIndex
                ? { ...p, status: 'failed', error: errorMessage, duration }
                : p
            ),
          }));
        }
      },

      clearHistoryForSpec: (specId: string) => {
        set((state) => {
          const newHistory = { ...state.completedPhasesBySpec };
          delete newHistory[specId];
          return { completedPhasesBySpec: newHistory };
        });
      },
    }),
    {
      name: 'devflow-autopilot',
      partialize: (state) => ({
        // Persist all important state for resumption
        // Convert running to interrupted, keep awaiting_input as-is
        status: state.status === 'running' ? 'interrupted' : state.status,
        currentPhaseIndex: state.currentPhaseIndex,
        // Persist phases with their outputs - mark running phases as interrupted
        phases: state.phases.map(p =>
          p.status === 'running'
            ? { ...p, status: 'failed' as PhaseStatus, error: 'Interrupted by app restart' }
            : p
        ),
        specId: state.specId,
        specTitle: state.specTitle,
        specContent: state.specContent,
        projectPath: state.projectPath,
        error: state.error,
        // Persist pending config for awaiting_input resumption
        pendingPhasesConfig: state.pendingPhasesConfig,
        // Persist history of completed phases per spec
        completedPhasesBySpec: state.completedPhasesBySpec,
      }),
      onRehydrateStorage: () => (state) => {
        // Fix orphaned 'running' states on app load
        if (state) {
          if (state.status === 'running') {
            state.status = 'interrupted';
            state.error = 'Interrupted by app restart - click Resume to continue';
          }
          state.phases = state.phases.map(p =>
            p.status === 'running'
              ? { ...p, status: 'failed' as PhaseStatus, error: 'Interrupted by app restart' }
              : p
          );
        }
      },
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

// Helper to build continuation prompts (when user responds after a phase completes)
function buildContinuationPrompt(
  agent: AgentId,
  specContent: string,
  previousOutputs: string[],
  lastOutput: string,
  userResponse: string
): string {
  const context = previousOutputs.length > 0
    ? `\n\nPrevious phases output:\n${previousOutputs.join('\n---\n')}`
    : '';

  return `As the ${agent.charAt(0).toUpperCase() + agent.slice(1)} agent, continue the analysis based on user feedback:

ORIGINAL SPEC:
${specContent}
${context}

YOUR PREVIOUS OUTPUT:
${lastOutput}

USER RESPONSE:
${userResponse}

Please continue your analysis incorporating the user's feedback. Provide updated recommendations or proceed with the requested clarifications.`;
}
