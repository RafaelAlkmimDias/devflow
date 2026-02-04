import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import {
  AgentId,
  PhaseResult,
  PhaseStatus,
  RunStatus,
  AutopilotConfig,
  SpecPhaseHistory,
  DEFAULT_PHASES,
  DEFAULT_CONFIG,
} from '@/domain/types'

import {
  getNextAgent,
  markInterruptedPhases,
  AutopilotOrchestrator,
  OrchestratorCallbacks,
} from '@/domain/autopilot'

export type { AgentId, PhaseResult, PhaseStatus, RunStatus, AutopilotConfig, SpecPhaseHistory }
export { DEFAULT_PHASES, DEFAULT_CONFIG }

interface AutopilotState {
  // Core state
  status: RunStatus
  currentPhaseIndex: number
  phases: PhaseResult[]
  error: string | null
  specId: string | null
  specTitle: string | null
  specContent: string | null
  projectPath: string | null
  liveLog: string
  pendingPhasesConfig: AutopilotConfig | null
  completedPhasesBySpec: Record<string, Record<AgentId, SpecPhaseHistory>>

  // Config modal state
  isConfigModalOpen: boolean
  selectedSpecId: string | null
  selectedSpecTitle: string | null
  selectedSpecContent: string | null

  // Actions
  openConfigModal: (specId: string, specTitle: string, specContent: string) => void
  closeConfigModal: () => void
  startRun: (config: AutopilotConfig, projectPath: string) => Promise<void>
  resumeRun: () => Promise<void>
  continuePhase: (phaseIndex: number, userResponse: string) => Promise<void>
  skipToNextAgent: () => Promise<void>
  runNextAgent: () => Promise<void>
  getNextAgent: () => AgentId | null
  reset: () => void
  appendLog: (text: string) => void
  clearLog: () => void
  getCompletedPhasesForSpec: (specId: string) => Record<AgentId, SpecPhaseHistory>
  clearHistoryForSpec: (specId: string) => void
}

let orchestratorInstance: AutopilotOrchestrator | null = null

function getOrchestrator(get: () => AutopilotState, set: (partial: Partial<AutopilotState>) => void): AutopilotOrchestrator {
  if (!orchestratorInstance) {
    const callbacks: OrchestratorCallbacks = {
      onPhaseStart: (index, phases) => {
        set({ currentPhaseIndex: index, phases })
      },
      onPhaseComplete: (_index, phases, history) => {
        set({ phases, completedPhasesBySpec: history })
      },
      onPhaseFailed: (_index, phases, error) => {
        set({ status: 'failed', error, phases })
      },
      onAwaitingInput: (config) => {
        set({ status: 'awaiting_input', pendingPhasesConfig: config })
      },
      onRunComplete: () => {
        set({ status: 'completed', pendingPhasesConfig: null })
      },
      onPhasesUpdate: (phases) => {
        set({ phases })
      },
      getState: () => ({
        phases: get().phases,
        specContent: get().specContent || '',
        projectPath: get().projectPath || '',
        specId: get().specId || '',
        pendingPhasesConfig: get().pendingPhasesConfig,
      }),
      updateHistory: (specId, agentId, output) => {
        const current = get().completedPhasesBySpec
        const newHistory = { ...current }
        if (!newHistory[specId]) newHistory[specId] = {} as Record<AgentId, SpecPhaseHistory>
        newHistory[specId][agentId] = {
          completedAt: new Date().toISOString(),
          output: output.substring(0, 500),
        }
        return newHistory
      },
    }
    orchestratorInstance = new AutopilotOrchestrator(callbacks)
  }
  return orchestratorInstance
}

export const useAutopilotStore = create<AutopilotState>()(
  persist(
    (set, get) => ({
      // Initial state
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
        })
      },

      closeConfigModal: () => {
        set({
          isConfigModalOpen: false,
          selectedSpecId: null,
          selectedSpecTitle: null,
          selectedSpecContent: null,
        })
      },

      startRun: async (config, projectPath) => {
        const { selectedSpecId, selectedSpecTitle, selectedSpecContent, phases: existingPhases, specId: existingSpecId } = get()
        if (!selectedSpecId || !selectedSpecTitle || !selectedSpecContent) {
          throw new Error('No spec selected')
        }

        set({
          status: 'running',
          error: null,
          specId: selectedSpecId,
          specTitle: selectedSpecTitle,
          specContent: selectedSpecContent,
          projectPath,
          isConfigModalOpen: false,
        })

        const orchestrator = getOrchestrator(get, set)
        await orchestrator.startRun(config, existingPhases, existingSpecId, selectedSpecId, selectedSpecContent, projectPath)
      },

      resumeRun: async () => {
        const { specContent, projectPath, status } = get()
        if (!specContent || !projectPath) throw new Error('No spec content or project path to resume')
        if (status !== 'interrupted' && status !== 'failed') throw new Error('Can only resume interrupted or failed runs')

        set({ status: 'running', error: null })
        const orchestrator = getOrchestrator(get, set)
        await orchestrator.resumeRun()
      },

      continuePhase: async (phaseIndex, userResponse) => {
        const { specContent, projectPath, status } = get()
        if (!specContent || !projectPath) throw new Error('No spec content or project path')
        if (status === 'running') throw new Error('Cannot continue while another phase is running')

        set({ status: 'running', error: null })
        const orchestrator = getOrchestrator(get, set)
        await orchestrator.continuePhase(phaseIndex, userResponse)
      },

      skipToNextAgent: async () => {
        const { status, pendingPhasesConfig, specContent, projectPath } = get()
        if (status !== 'awaiting_input') throw new Error('Not awaiting input')
        if (!pendingPhasesConfig || !specContent || !projectPath) throw new Error('No pending config or spec data')

        set({ status: 'running', pendingPhasesConfig: null })
        const orchestrator = getOrchestrator(get, set)
        await orchestrator.skipToNextAgent()
      },

      runNextAgent: async () => {
        const { specId, specContent, projectPath, status } = get()
        if (!specId || !specContent || !projectPath) throw new Error('No spec data available')
        if (status === 'running') throw new Error('Another agent is already running')

        set({ status: 'running', error: null })
        const orchestrator = getOrchestrator(get, set)
        await orchestrator.runNextAgent()
      },

      getNextAgent: () => getNextAgent(get().phases),

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
        })
      },

      appendLog: (text) => set((state) => ({ liveLog: state.liveLog + text })),
      clearLog: () => set({ liveLog: '' }),

      getCompletedPhasesForSpec: (specId) => {
        const { completedPhasesBySpec } = get()
        if (!completedPhasesBySpec || typeof completedPhasesBySpec !== 'object') {
          return {} as Record<AgentId, SpecPhaseHistory>
        }
        return completedPhasesBySpec[specId] || ({} as Record<AgentId, SpecPhaseHistory>)
      },

      clearHistoryForSpec: (specId) => {
        set((state) => {
          const newHistory = { ...state.completedPhasesBySpec }
          delete newHistory[specId]
          return { completedPhasesBySpec: newHistory }
        })
      },
    }),
    {
      name: 'devflow-autopilot',
      partialize: (state) => ({
        status: state.status === 'running' ? 'interrupted' : state.status,
        currentPhaseIndex: state.currentPhaseIndex,
        phases: markInterruptedPhases(state.phases),
        specId: state.specId,
        specTitle: state.specTitle,
        specContent: state.specContent,
        projectPath: state.projectPath,
        error: state.error,
        pendingPhasesConfig: state.pendingPhasesConfig,
        completedPhasesBySpec: state.completedPhasesBySpec,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (state.status === 'running') {
            state.status = 'interrupted'
            state.error = 'Interrupted by app restart - click Resume to continue'
          }
          if (!state.phases || !Array.isArray(state.phases)) {
            state.phases = []
          } else {
            state.phases = markInterruptedPhases(state.phases)
          }
          if (!state.completedPhasesBySpec || typeof state.completedPhasesBySpec !== 'object') {
            state.completedPhasesBySpec = {}
          }
        }
      },
    }
  )
)
