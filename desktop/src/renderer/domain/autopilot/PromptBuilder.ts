import { AgentId } from '../types'

/**
 * Agent-specific prompt templates for initial execution
 */
const AGENT_PROMPTS: Record<AgentId, { role: string; focus: string[] }> = {
  strategist: {
    role: 'Strategist agent, analyze this spec and refine the requirements',
    focus: [
      'Validating acceptance criteria',
      'Identifying edge cases',
      'Clarifying ambiguities',
    ],
  },
  architect: {
    role: 'Architect agent, design the technical solution',
    focus: [
      'System design decisions',
      'Component architecture',
      'Integration points',
      'Technical constraints',
    ],
  },
  designer: {
    role: 'Designer agent, create the visual experience and UX',
    focus: [
      'Design system and visual identity',
      'Component styling and states',
      'Animations and micro-interactions',
      'Accessibility and usability',
    ],
  },
  builder: {
    role: 'Builder agent, implement the solution',
    focus: [
      'Writing clean, tested code',
      'Following project conventions',
      'Implementing all requirements',
    ],
  },
  guardian: {
    role: 'Guardian agent, validate the implementation',
    focus: [
      'Code review',
      'Security analysis',
      'Performance considerations',
      'Best practices',
    ],
  },
  chronicler: {
    role: 'Chronicler agent, update documentation',
    focus: [
      'Updating relevant docs',
      'Recording decisions',
      'Maintaining knowledge graph',
    ],
  },
}

/**
 * Format previous outputs as context
 */
function formatPreviousOutputs(previousOutputs: string[]): string {
  if (previousOutputs.length === 0) return ''
  return `\n\nPrevious phases output:\n${previousOutputs.join('\n---\n')}`
}

/**
 * Build the initial prompt for an agent execution
 */
export function buildAgentPrompt(
  agent: AgentId,
  specContent: string,
  previousOutputs: string[]
): string {
  const config = AGENT_PROMPTS[agent]
  const context = formatPreviousOutputs(previousOutputs)
  const focusPoints = config.focus.map(f => `- ${f}`).join('\n')

  return `As the ${config.role}:

${specContent}
${context}

Focus on:
${focusPoints}`
}

/**
 * Build a continuation prompt when user responds to a question
 */
export function buildContinuationPrompt(
  agent: AgentId,
  specContent: string,
  previousOutputs: string[],
  lastOutput: string,
  userResponse: string
): string {
  const context = formatPreviousOutputs(previousOutputs)
  const capitalizedAgent = agent.charAt(0).toUpperCase() + agent.slice(1)

  return `As the ${capitalizedAgent} agent, continue the analysis based on user feedback:

ORIGINAL SPEC:
${specContent}
${context}

YOUR PREVIOUS OUTPUT:
${lastOutput}

USER RESPONSE:
${userResponse}

Please continue your analysis incorporating the user's feedback. Provide updated recommendations or proceed with the requested clarifications.`
}

/**
 * Format user response for display in combined output
 */
export function formatUserResponseSeparator(userResponse: string): string {
  return `\n\n---\n[Sua resposta: ${userResponse}]\n---\n\n`
}
