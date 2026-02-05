import { AgentType } from '../../../shared/types'

/**
 * Map agent types to Claude Code skills (slash commands)
 */
export const AGENT_SKILLS: Record<AgentType, string> = {
  strategist: '/agents:strategist',
  architect: '/agents:architect',
  designer: '/agents:designer',
  builder: '/agents:builder',
  guardian: '/agents:guardian',
  chronicler: '/agents:chronicler',
}

/**
 * Default allowed tools for agent execution
 */
export const DEFAULT_ALLOWED_TOOLS = 'Edit,Write,Read,Glob,Grep,Bash'

/**
 * Agent execution timeout in milliseconds (15 minutes)
 */
export const AGENT_EXECUTION_TIMEOUT = 15 * 60 * 1000
