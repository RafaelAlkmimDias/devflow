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
  buildSessionAgentPrompt,
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
 * Uses a single persistent Claude CLI session for all agents,
 * eliminating redundant context re-sends (~95% token savings).
 */
export class AutopilotOrchestrator {
  private sessionActive = false

  constructor(private callbacks: OrchestratorCallbacks) {}

  /**
   * Run phases using the single-session flow.
   * Starts a session, runs each agent sequentially, ends the session.
   */
  async runPhases(
    config: AutopilotConfig,
    initialPhases: PhaseResult[],
    specContent: string,
    projectPath: string,
    specId: string,
    startIndex: number
  ): Promise<void> {
    let phases = initialPhases

    // Start persistent session
    if (!this.sessionActive) {
      try {
        await agentApi.startSession(projectPath)
        this.sessionActive = true
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to start session'
        console.error('[Orchestrator] Failed to start session:', errorMessage)
        // Fallback: if session start fails, mark first phase as failed
        if (phases[startIndex]) {
          phases = setPhaseFailed(phases, startIndex, errorMessage, 0)
          this.callbacks.onPhaseFailed(startIndex, phases, errorMessage)
        }
        return
      }
    }

    const totalPhases = config.phases.length

    try {
      for (let i = startIndex; i < totalPhases; i++) {
        if (phases[i].status === 'completed') continue

        const agentId = config.phases[i]
        const isFirstAgent = i === startIndex && !this.hasContextInSession(phases, startIndex)
        const isLastAgent = i === totalPhases - 1

        phases = setPhaseRunning(phases, i)
        this.callbacks.onPhaseStart(i, phases)

        const startTime = Date.now()

        try {
          // Build prompt: first agent gets spec, subsequent agents only get focus points
          const prompt = buildSessionAgentPrompt(agentId, specContent, isFirstAgent, isLastAgent)
          const output = await agentApi.sendPrompt(agentId, prompt)
          const duration = Date.now() - startTime

          phases = setPhaseCompleted(phases, i, output || '', duration)

          const history = this.callbacks.updateHistory(specId, agentId, output || '')
          this.callbacks.onPhaseComplete(i, phases, history)

          const hasQuestion = outputEndsWithQuestion(output || '')

          if (hasQuestion && !isLastAgent) {
            this.callbacks.onAwaitingInput(config)
            return // Session stays alive — will resume via continuePhase
          }
        } catch (error) {
          const duration = Date.now() - startTime
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          phases = setPhaseFailed(phases, i, errorMessage, duration)
          this.callbacks.onPhaseFailed(i, phases, errorMessage)
          this.endSessionSafely()
          return
        }
      }

      this.callbacks.onRunComplete()
    } finally {
      // Only end session if run completed (not paused for user input)
      const isAwaitingInput = phases.some(p =>
        p.status === 'completed' && outputEndsWithQuestion(p.output || '')
      )
      if (!isAwaitingInput) {
        this.endSessionSafely()
      }
    }
  }

  /**
   * Check if previous agents have already run in this session
   * (i.e., we're resuming from a pause, not starting fresh)
   */
  private hasContextInSession(phases: PhaseResult[], startIndex: number): boolean {
    // If any phase before startIndex is completed, its context is already in the session
    return phases.slice(0, startIndex).some(p => p.status === 'completed')
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

    // Resume creates a new session (context from previous session is lost)
    // This is the graceful degradation scenario
    await this.runPhases(config, phases, specContent, projectPath, specId, startIndex)
  }

  /**
   * Continue a phase after user responds to a question.
   * In single-session flow, just sends the response directly to the PTY.
   */
  async continuePhase(phaseIndex: number, userResponse: string): Promise<void> {
    const state = this.callbacks.getState()
    const { phases, specContent, projectPath, specId, pendingPhasesConfig } = state

    const phase = phases[phaseIndex]
    if (!phase) throw new Error('Phase not found')

    let updatedPhases = setPhaseRunning(phases, phaseIndex)
    this.callbacks.onPhaseStart(phaseIndex, updatedPhases)

    const startTime = Date.now()

    try {
      if (this.sessionActive) {
        // Single-session flow: the previous claude -p process already exited
        // after emitting AWAITING_INPUT. Use sendPrompt with --continue to
        // continue the conversation with the user's response as a new prompt.
        const continuationPrompt = `Resposta do usuário à sua pergunta:\n\n${userResponse}\n\nContinue sua análise incorporando o feedback do usuário.\nAo finalizar, emita [STATUS: READY_TO_PROCEED]\nSe precisar de mais input do usuário, emita [STATUS: AWAITING_INPUT]`

        const newOutput = await agentApi.sendPrompt(phase.agent, continuationPrompt)
        const duration = Date.now() - startTime

        const combinedOutput = `${phase.output || ''}\n\n---\n[Sua resposta: ${userResponse}]\n---\n\n${newOutput || ''}`

        updatedPhases = updatedPhases.map((p, idx) =>
          idx === phaseIndex
            ? { ...p, status: 'completed' as PhaseStatus, output: combinedOutput, duration: (p.duration || 0) + duration }
            : p
        )

        const history = this.callbacks.updateHistory(specId, phase.agent, combinedOutput)
        this.callbacks.onPhaseComplete(phaseIndex, updatedPhases, history)

        // Check if the new output also has a question
        const hasQuestion = outputEndsWithQuestion(newOutput || '')
        if (hasQuestion && pendingPhasesConfig) {
          this.callbacks.onAwaitingInput(pendingPhasesConfig)
          return
        }

        // Continue with remaining phases
        if (pendingPhasesConfig) {
          const completedCount = updatedPhases.filter(p => p.status === 'completed').length
          if (completedCount < pendingPhasesConfig.phases.length) {
            await this.skipToNextAgentInternal(pendingPhasesConfig, updatedPhases)
            return
          }
        }

        this.callbacks.onRunComplete()
      } else {
        // Fallback: legacy flow (session died, need new PTY)
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
      }
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
      this.endSessionSafely()
      return
    }

    let phases = currentPhases
    const totalPhases = config.phases.length

    for (let i = nextPhaseIndex; i < totalPhases; i++) {
      const agentId = config.phases[i]
      const isLastAgent = i === totalPhases - 1
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
        let output: string

        if (this.sessionActive) {
          // Single-session flow: subsequent agents don't need spec/previousOutputs
          const prompt = buildSessionAgentPrompt(agentId, specContent, false, isLastAgent)
          output = await agentApi.sendPrompt(agentId, prompt)
        } else {
          // Fallback: legacy flow
          const previousOutputs = collectPreviousOutputs(phases)
          const prompt = buildAgentPrompt(agentId, specContent, previousOutputs)
          output = await agentApi.execute(agentId, prompt, projectPath)
        }

        const duration = Date.now() - startTime

        phases = setPhaseCompleted(phases, phaseIndex, output || '', duration)

        const history = this.callbacks.updateHistory(specId, agentId, output || '')
        this.callbacks.onPhaseComplete(phaseIndex, phases, history)

        const hasQuestion = outputEndsWithQuestion(output || '')

        if (hasQuestion && !isLastAgent) {
          this.callbacks.onAwaitingInput(config)
          return
        }
      } catch (error) {
        const duration = Date.now() - startTime
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        phases = setPhaseFailed(phases, phaseIndex, errorMessage, duration)
        this.callbacks.onPhaseFailed(phaseIndex, phases, errorMessage)
        this.endSessionSafely()
        return
      }
    }

    this.callbacks.onRunComplete()
    this.endSessionSafely()
  }

  async runNextAgent(): Promise<void> {
    const state = this.callbacks.getState()
    const { phases, specContent, projectPath, specId } = state

    const nextAgent = getNextAgent(phases)
    if (!nextAgent) throw new Error('No more agents to run')

    const newPhase = createPhase(nextAgent, 'running')

    let updatedPhases = [...phases, newPhase]
    const phaseIndex = updatedPhases.length - 1

    this.callbacks.onPhaseStart(phaseIndex, updatedPhases)
    const startTime = Date.now()

    try {
      let output: string

      if (this.sessionActive) {
        const prompt = buildSessionAgentPrompt(nextAgent, specContent, false, true)
        output = await agentApi.sendPrompt(nextAgent, prompt)
      } else {
        // Start a new session for single-agent run
        await agentApi.startSession(projectPath)
        this.sessionActive = true
        const prompt = buildSessionAgentPrompt(nextAgent, specContent, true, true)
        output = await agentApi.sendPrompt(nextAgent, prompt)
      }

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
    } finally {
      this.endSessionSafely()
    }
  }

  /**
   * Safely end the session, ignoring errors
   */
  private endSessionSafely(): void {
    if (this.sessionActive) {
      try {
        agentApi.endSession()
      } catch {
        // Ignore errors during session cleanup
      }
      this.sessionActive = false
    }
  }
}
