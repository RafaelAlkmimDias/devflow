import { agentApi } from '@/infrastructure/api'
import {
  AgentId,
  PhaseResult,
  PhaseStatus,
  AutopilotConfig,
  SpecPhaseHistory,
} from '../types'
import {
  outputEndsWithQuestion,
  buildAgentPrompt,
  buildContinuationPrompt,
  formatUserResponseSeparator,
  initializePhases,
  findStartIndex,
  collectPreviousOutputs,
  getNextAgent,
  createPhase,
  setPhaseRunning,
  setPhaseCompleted,
  setPhaseFailed,
} from '.'

export interface OrchestratorState {
  phases: PhaseResult[]
  specContent: string
  projectPath: string
  specId: string
  pendingPhasesConfig: AutopilotConfig | null
}

export interface OrchestratorCallbacks {
  onPhaseStart: (index: number, phases: PhaseResult[]) => void
  onPhaseComplete: (index: number, phases: PhaseResult[], history: Record<string, Record<AgentId, SpecPhaseHistory>>) => void
  onPhaseFailed: (index: number, phases: PhaseResult[], error: string) => void
  onAwaitingInput: (config: AutopilotConfig | null) => void
  onRunComplete: () => void
  onPhasesUpdate: (phases: PhaseResult[]) => void
  getState: () => OrchestratorState
  updateHistory: (specId: string, agentId: AgentId, output: string) => Record<string, Record<AgentId, SpecPhaseHistory>>
}

/**
 * Orchestrates the autopilot workflow execution.
 * Manages phase transitions and agent executions.
 */
export class AutopilotOrchestrator {
  constructor(private callbacks: OrchestratorCallbacks) {}

  async runPhases(
    config: AutopilotConfig,
    initialPhases: PhaseResult[],
    specContent: string,
    projectPath: string,
    specId: string,
    startIndex: number
  ): Promise<void> {
    let phases = initialPhases
    let previousOutputs = collectPreviousOutputs(phases)

    for (let i = startIndex; i < config.phases.length; i++) {
      if (phases[i].status === 'completed') continue

      const agentId = config.phases[i]
      phases = setPhaseRunning(phases, i)
      this.callbacks.onPhaseStart(i, phases)

      const startTime = Date.now()

      try {
        const prompt = buildAgentPrompt(agentId, specContent, previousOutputs)
        const output = await agentApi.execute(agentId, prompt, projectPath)
        const duration = Date.now() - startTime

        previousOutputs.push(output || '')
        phases = setPhaseCompleted(phases, i, output || '', duration)

        const history = this.callbacks.updateHistory(specId, agentId, output || '')
        this.callbacks.onPhaseComplete(i, phases, history)

        const hasQuestion = outputEndsWithQuestion(output || '')
        const isLastPhase = i === config.phases.length - 1

        if (hasQuestion && !isLastPhase) {
          this.callbacks.onAwaitingInput(config)
          return
        }
      } catch (error) {
        const duration = Date.now() - startTime
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        phases = setPhaseFailed(phases, i, errorMessage, duration)
        this.callbacks.onPhaseFailed(i, phases, errorMessage)
        return
      }
    }

    this.callbacks.onRunComplete()
  }

  async startRun(
    config: AutopilotConfig,
    existingPhases: PhaseResult[],
    existingSpecId: string | null,
    selectedSpecId: string,
    specContent: string,
    projectPath: string
  ): Promise<void> {
    const initialPhases = initializePhases(config.phases, existingPhases, existingSpecId, selectedSpecId)
    const startIndex = findStartIndex(initialPhases)

    await this.runPhases(config, initialPhases, specContent, projectPath, selectedSpecId, startIndex)
  }

  async resumeRun(): Promise<void> {
    const state = this.callbacks.getState()
    const { phases, specContent, projectPath, specId } = state

    const startIndex = findStartIndex(phases)
    if (startIndex < 0 || phases.every(p => p.status === 'completed')) {
      this.callbacks.onRunComplete()
      return
    }

    const config: AutopilotConfig = {
      phases: phases.map(p => p.agent),
    }

    await this.runPhases(config, phases, specContent, projectPath, specId, startIndex)
  }

  async continuePhase(phaseIndex: number, userResponse: string): Promise<void> {
    const state = this.callbacks.getState()
    const { phases, specContent, projectPath, specId, pendingPhasesConfig } = state

    const phase = phases[phaseIndex]
    if (!phase) throw new Error('Phase not found')

    let updatedPhases = setPhaseRunning(phases, phaseIndex)
    this.callbacks.onPhaseStart(phaseIndex, updatedPhases)

    const startTime = Date.now()

    try {
      const previousOutputs = collectPreviousOutputs(phases.filter((_, idx) => idx < phaseIndex))
      const continuationPrompt = buildContinuationPrompt(
        phase.agent,
        specContent,
        previousOutputs,
        phase.output || '',
        userResponse
      )

      const newOutput = await agentApi.execute(phase.agent, continuationPrompt, projectPath)
      const duration = Date.now() - startTime

      const combinedOutput = `${phase.output || ''}${formatUserResponseSeparator(userResponse)}${newOutput || ''}`
      updatedPhases = updatedPhases.map((p, idx) =>
        idx === phaseIndex
          ? { ...p, status: 'completed' as PhaseStatus, output: combinedOutput, duration: (p.duration || 0) + duration }
          : p
      )

      const history = this.callbacks.updateHistory(specId, phase.agent, combinedOutput)
      this.callbacks.onPhaseComplete(phaseIndex, updatedPhases, history)

      const hasQuestion = outputEndsWithQuestion(newOutput || '')
      if (hasQuestion && pendingPhasesConfig) {
        this.callbacks.onAwaitingInput(pendingPhasesConfig)
        return
      }

      if (pendingPhasesConfig) {
        const completedCount = updatedPhases.filter(p => p.status === 'completed').length
        if (completedCount < pendingPhasesConfig.phases.length) {
          await this.skipToNextAgentInternal(pendingPhasesConfig, updatedPhases)
          return
        }
      }

      this.callbacks.onRunComplete()
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      updatedPhases = updatedPhases.map((p, idx) =>
        idx === phaseIndex
          ? { ...p, status: 'failed' as PhaseStatus, error: errorMessage, duration: (p.duration || 0) + duration }
          : p
      )
      this.callbacks.onPhaseFailed(phaseIndex, updatedPhases, errorMessage)
    }
  }

  async skipToNextAgent(): Promise<void> {
    const state = this.callbacks.getState()
    const { phases, pendingPhasesConfig } = state

    if (!pendingPhasesConfig) throw new Error('No pending config')

    await this.skipToNextAgentInternal(pendingPhasesConfig, phases)
  }

  private async skipToNextAgentInternal(config: AutopilotConfig, currentPhases: PhaseResult[]): Promise<void> {
    const state = this.callbacks.getState()
    const { specContent, projectPath, specId } = state

    const completedCount = currentPhases.filter(p => p.status === 'completed').length
    const nextPhaseIndex = completedCount

    if (nextPhaseIndex >= config.phases.length) {
      this.callbacks.onRunComplete()
      return
    }

    let phases = currentPhases
    let previousOutputs = collectPreviousOutputs(phases)

    for (let i = nextPhaseIndex; i < config.phases.length; i++) {
      const agentId = config.phases[i]
      let phaseIndex = phases.findIndex(p => p.agent === agentId)

      if (phaseIndex < 0) {
        const newPhase = createPhase(agentId, 'running')
        phases = [...phases, newPhase]
        phaseIndex = phases.length - 1
      } else {
        phases = setPhaseRunning(phases, phaseIndex)
      }

      this.callbacks.onPhaseStart(phaseIndex, phases)
      const startTime = Date.now()

      try {
        const prompt = buildAgentPrompt(agentId, specContent, previousOutputs)
        const output = await agentApi.execute(agentId, prompt, projectPath)
        const duration = Date.now() - startTime

        previousOutputs.push(output || '')
        phases = setPhaseCompleted(phases, phaseIndex, output || '', duration)

        const history = this.callbacks.updateHistory(specId, agentId, output || '')
        this.callbacks.onPhaseComplete(phaseIndex, phases, history)

        const hasQuestion = outputEndsWithQuestion(output || '')
        const isLastPhase = i === config.phases.length - 1

        if (hasQuestion && !isLastPhase) {
          this.callbacks.onAwaitingInput(config)
          return
        }
      } catch (error) {
        const duration = Date.now() - startTime
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        phases = setPhaseFailed(phases, phaseIndex, errorMessage, duration)
        this.callbacks.onPhaseFailed(phaseIndex, phases, errorMessage)
        return
      }
    }

    this.callbacks.onRunComplete()
  }

  async runNextAgent(): Promise<void> {
    const state = this.callbacks.getState()
    const { phases, specContent, projectPath, specId } = state

    const nextAgent = getNextAgent(phases)
    if (!nextAgent) throw new Error('No more agents to run')

    const previousOutputs = collectPreviousOutputs(phases)
    const newPhase = createPhase(nextAgent, 'running')

    let updatedPhases = [...phases, newPhase]
    const phaseIndex = updatedPhases.length - 1

    this.callbacks.onPhaseStart(phaseIndex, updatedPhases)
    const startTime = Date.now()

    try {
      const prompt = buildAgentPrompt(nextAgent, specContent, previousOutputs)
      const output = await agentApi.execute(nextAgent, prompt, projectPath)
      const duration = Date.now() - startTime

      updatedPhases = setPhaseCompleted(updatedPhases, phaseIndex, output || '', duration)
      const history = this.callbacks.updateHistory(specId, nextAgent, output || '')
      this.callbacks.onPhaseComplete(phaseIndex, updatedPhases, history)
      this.callbacks.onRunComplete()
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      updatedPhases = setPhaseFailed(updatedPhases, phaseIndex, errorMessage, duration)
      this.callbacks.onPhaseFailed(phaseIndex, updatedPhases, errorMessage)
    }
  }
}
