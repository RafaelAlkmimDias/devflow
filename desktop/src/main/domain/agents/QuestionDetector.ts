/**
 * Strip ANSI escape codes from text.
 * PTY output contains color codes, cursor movements, etc. that break regex matching.
 */
function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
    .replace(/\x1b\].*?(\x07|\x1b\\)/g, '') // OSC sequences
    .replace(/[\x00-\x09\x0b-\x0c\x0e-\x1f]/g, '') // control chars (keep \n \r)
}

/**
 * Agent status markers - explicit signals from agents about whether to proceed or wait.
 * All agents MUST return one of these markers at the end of their response.
 */
export const STATUS_MARKERS = {
  DONE: /\[STATUS:\s*DONE\]/i,
  READY_TO_PROCEED: /\[STATUS:\s*READY_TO_PROCEED\]/i,
  AWAITING_INPUT: /\[STATUS:\s*AWAITING_INPUT\]/i,
}

/**
 * Detect agent status marker in output.
 * Strips ANSI codes before matching since PTY output contains terminal formatting.
 * Returns: 'ready' | 'done' | 'awaiting' | null
 */
export function detectAgentStatus(text: string): 'ready' | 'done' | 'awaiting' | null {
  const rawTail = text.slice(-3000)
  const recentText = stripAnsi(rawTail)

  if (STATUS_MARKERS.AWAITING_INPUT.test(recentText)) {
    return 'awaiting'
  }

  if (STATUS_MARKERS.DONE.test(recentText)) {
    return 'done'
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
