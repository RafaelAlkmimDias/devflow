import { AgentId } from '../types'

/**
 * Map agent types to Claude Code skills (slash commands).
 * Mirrored from main-process constants for renderer use.
 */
const AGENT_SKILLS: Record<AgentId, string> = {
  strategist: '/agents:strategist',
  architect: '/agents:architect',
  designer: '/agents:designer',
  builder: '/agents:builder',
  guardian: '/agents:guardian',
  chronicler: '/agents:chronicler',
}

/**
 * Agent-specific prompt templates
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
 * Build the prompt for the first agent (includes spec content).
 * Uses the skill slash command prefix.
 */
function buildFirstAgentPrompt(
  agent: AgentId,
  specContent: string,
  isLastAgent: boolean
): string {
  const skill = AGENT_SKILLS[agent] || `/agents:${agent}`
  const statusInstruction = isLastAgent
    ? 'Ao finalizar, emita [STATUS: DONE]'
    : 'Ao finalizar, emita [STATUS: READY_TO_PROCEED]'

  return `${skill} Analise esta spec:

${specContent}

${statusInstruction}
Se precisar de input do usuário, emita [STATUS: AWAITING_INPUT]`
}

/**
 * Build the prompt for subsequent agents (no spec/previousOutputs — already in session context).
 * Uses the skill slash command prefix.
 */
function buildSubsequentAgentPrompt(
  agent: AgentId,
  isLastAgent: boolean
): string {
  const skill = AGENT_SKILLS[agent] || `/agents:${agent}`
  const config = AGENT_PROMPTS[agent]
  const focusPoints = config.focus.map(f => `- ${f}`).join('\n')

  const statusInstruction = isLastAgent
    ? 'Ao finalizar, emita [STATUS: DONE]'
    : 'Ao finalizar, emita [STATUS: READY_TO_PROCEED]'

  return `${skill} Continue baseado na análise anterior. Foque em:
${focusPoints}

${statusInstruction}
Se precisar de input do usuário, emita [STATUS: AWAITING_INPUT]`
}

/**
 * Build the prompt for an agent in the single-session flow.
 * First agent gets the spec content; subsequent agents only get focus points
 * (spec and previous outputs are already in the CLI session context).
 */
export function buildSessionAgentPrompt(
  agent: AgentId,
  specContent: string,
  isFirstAgent: boolean,
  isLastAgent: boolean
): string {
  if (isFirstAgent) {
    return buildFirstAgentPrompt(agent, specContent, isLastAgent)
  }
  return buildSubsequentAgentPrompt(agent, isLastAgent)
}

// ─── Legacy functions (kept for backward compatibility / resume) ──────

/**
 * Format previous outputs as context
 * @deprecated Only used for resume flow
 */
function formatPreviousOutputs(previousOutputs: string[]): string {
  if (previousOutputs.length === 0) return ''
  return `\n\nPrevious phases output:\n${previousOutputs.join('\n---\n')}`
}

/**
 * Build the initial prompt for an agent execution (legacy multi-PTY flow)
 * @deprecated Use buildSessionAgentPrompt instead
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
 * Build a continuation prompt when user responds to a question (legacy)
 * @deprecated In single-session flow, use agentApi.sendResponse() directly
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
 * @deprecated Not needed in single-session flow
 */
export function formatUserResponseSeparator(userResponse: string): string {
  return `\n\n---\n[Sua resposta: ${userResponse}]\n---\n\n`
}
