import { AgentId, PhaseResult, PhaseStatus, DEFAULT_PHASES, AGENT_ORDER } from '../types'

/**
 * Initialize phases from configuration, preserving completed phases if resuming
 */
export function initializePhases(
  configPhases: AgentId[],
  existingPhases: PhaseResult[],
  existingSpecId: string | null,
  selectedSpecId: string
): PhaseResult[] {
  const isResumingSameSpec = existingSpecId === selectedSpecId && existingPhases.length > 0

  return configPhases.map((agentId) => {
    const phaseInfo = DEFAULT_PHASES.find((p) => p.id === agentId)

    // If resuming same spec, check if this phase was already completed
    if (isResumingSameSpec) {
      const existingPhase = existingPhases.find(p => p.agent === agentId)
      if (existingPhase && existingPhase.status === 'completed' && existingPhase.output) {
        return existingPhase
      }
    }

    return {
      agent: agentId,
      name: phaseInfo?.name || agentId,
      status: 'pending' as PhaseStatus,
    }
  })
}

/**
 * Find the first non-completed phase index
 */
export function findStartIndex(phases: PhaseResult[]): number {
  const index = phases.findIndex(p => p.status !== 'completed')
  return index >= 0 ? index : 0
}

/**
 * Collect outputs from completed phases
 */
export function collectPreviousOutputs(phases: PhaseResult[]): string[] {
  return phases
    .filter(p => p.status === 'completed' && p.output)
    .map(p => p.output!)
}

/**
 * Get the next agent in the workflow based on completed phases
 */
export function getNextAgent(phases: PhaseResult[]): AgentId | null {
  if (!phases || !Array.isArray(phases)) {
    return 'strategist'
  }

  const completedAgents = phases
    .filter(p => p.status === 'completed')
    .map(p => p.agent)

  const lastCompletedAgent = completedAgents[completedAgents.length - 1]

  if (!lastCompletedAgent) {
    return 'strategist'
  }

  const lastIndex = AGENT_ORDER.indexOf(lastCompletedAgent)

  if (lastIndex < AGENT_ORDER.length - 1) {
    return AGENT_ORDER[lastIndex + 1]
  }

  return null
}

/**
 * Create a new phase result for an agent
 */
export function createPhase(agentId: AgentId, status: PhaseStatus = 'pending'): PhaseResult {
  const phaseInfo = DEFAULT_PHASES.find(p => p.id === agentId)
  return {
    agent: agentId,
    name: phaseInfo?.name || agentId,
    status,
  }
}

/**
 * Update a phase to running status
 */
export function setPhaseRunning(phases: PhaseResult[], index: number): PhaseResult[] {
  return phases.map((p, idx) =>
    idx === index ? { ...p, status: 'running' as PhaseStatus, error: undefined } : p
  )
}

/**
 * Update a phase to completed status
 */
export function setPhaseCompleted(
  phases: PhaseResult[],
  index: number,
  output: string,
  duration: number
): PhaseResult[] {
  return phases.map((p, idx) =>
    idx === index ? { ...p, status: 'completed' as PhaseStatus, output, duration } : p
  )
}

/**
 * Update a phase to failed status
 */
export function setPhaseFailed(
  phases: PhaseResult[],
  index: number,
  error: string,
  duration: number
): PhaseResult[] {
  return phases.map((p, idx) =>
    idx === index
      ? { ...p, status: 'failed' as PhaseStatus, error, duration }
      : idx > index && p.status !== 'completed'
        ? { ...p, status: 'skipped' as PhaseStatus }
        : p
  )
}

/**
 * Mark interrupted phases as failed
 */
export function markInterruptedPhases(phases: PhaseResult[]): PhaseResult[] {
  return phases.map(p =>
    p.status === 'running'
      ? { ...p, status: 'failed' as PhaseStatus, error: 'Interrupted by app restart' }
      : p
  )
}
