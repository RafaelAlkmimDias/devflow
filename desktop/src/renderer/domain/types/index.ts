/**
 * Domain types for the autopilot system
 */

// Re-export AgentType from shared as AgentId for frontend naming convention
import { AgentType } from '../../../shared/types'
export type AgentId = AgentType
export type PhaseStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
export type RunStatus = 'idle' | 'running' | 'completed' | 'failed' | 'interrupted' | 'awaiting_input'

/**
 * Configuration for an autopilot run
 */
export interface AutopilotConfig {
  phases: AgentId[]
}

/**
 * Result of a single phase execution
 */
export interface PhaseResult {
  agent: AgentId
  name: string
  status: PhaseStatus
  output?: string
  error?: string
  duration?: number
}

/**
 * Phase information with display name
 */
export interface PhaseInfo {
  id: AgentId
  name: string
}

/**
 * History of a completed phase for a spec
 */
export interface SpecPhaseHistory {
  completedAt: string
  output?: string
}

/**
 * Default phases configuration
 */
export const DEFAULT_PHASES: PhaseInfo[] = [
  { id: 'strategist', name: 'Planning' },
  { id: 'architect', name: 'Architecture' },
  { id: 'designer', name: 'UX/UI Design' },
  { id: 'builder', name: 'Implementation' },
  { id: 'guardian', name: 'Validation' },
  { id: 'chronicler', name: 'Documentation' },
]

/**
 * Default workflow configuration
 */
export const DEFAULT_CONFIG: AutopilotConfig = {
  phases: ['strategist', 'architect', 'designer', 'builder', 'guardian', 'chronicler'],
}

/**
 * Agent order for determining next agent
 */
export const AGENT_ORDER: AgentId[] = ['strategist', 'architect', 'designer', 'builder', 'guardian', 'chronicler']
