/**
 * Agent status markers - explicit signals from agents about whether to proceed or wait.
 * All agents MUST return one of these markers at the end of their response.
 */
export const STATUS_MARKERS = {
  READY_TO_PROCEED: /\[STATUS:\s*READY_TO_PROCEED\]/i,
  AWAITING_INPUT: /\[STATUS:\s*AWAITING_INPUT\]/i,
}

/**
 * Detect agent status marker in output.
 * Returns: 'ready' | 'awaiting' | null
 */
export function detectAgentStatus(text: string): 'ready' | 'awaiting' | null {
  const recentText = text.slice(-300)

  if (STATUS_MARKERS.AWAITING_INPUT.test(recentText)) {
    return 'awaiting'
  }

  if (STATUS_MARKERS.READY_TO_PROCEED.test(recentText)) {
    return 'ready'
  }

  return null
}

/**
 * Detect if output contains a question waiting for response.
 * Agents MUST include [STATUS: READY_TO_PROCEED] or [STATUS: AWAITING_INPUT] marker.
 *
 * Returns true if agent needs user input (AWAITING_INPUT).
 * Returns false if agent is ready to proceed or no marker found.
 */
export function detectQuestion(text: string): boolean {
  const agentStatus = detectAgentStatus(text)
  return agentStatus === 'awaiting'
}
