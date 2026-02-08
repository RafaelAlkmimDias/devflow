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
const STATUS_MARKERS = {
  DONE: /\[STATUS:\s*DONE\]/i,
  READY_TO_PROCEED: /\[STATUS:\s*READY_TO_PROCEED\]/i,
  AWAITING_INPUT: /\[STATUS:\s*AWAITING_INPUT\]/i,
}

/**
 * Detect agent status marker in output.
 * Strips ANSI codes before matching since PTY output contains terminal formatting.
 * Returns: 'ready' | 'done' | 'awaiting' | null
 */
export function detectAgentStatus(output: string): 'ready' | 'done' | 'awaiting' | null {
  if (!output) return null

  const rawTail = output.slice(-3000)
  const recentOutput = stripAnsi(rawTail)

  if (STATUS_MARKERS.AWAITING_INPUT.test(recentOutput)) {
    console.log('[QuestionHandler] Status marker detected: AWAITING_INPUT')
    return 'awaiting'
  }

  if (STATUS_MARKERS.DONE.test(recentOutput)) {
    console.log('[QuestionHandler] Status marker detected: DONE')
    return 'done'
  }

  if (STATUS_MARKERS.READY_TO_PROCEED.test(recentOutput)) {
    console.log('[QuestionHandler] Status marker detected: READY_TO_PROCEED')
    return 'ready'
  }

  return null
}

/**
 * Detect if output ends with a question requiring user input.
 * Agents MUST include [STATUS: READY_TO_PROCEED] or [STATUS: AWAITING_INPUT] marker.
 *
 * Returns true if agent needs user input (AWAITING_INPUT).
 * Returns false if agent is ready to proceed or no marker found.
 */
export function outputEndsWithQuestion(output: string): boolean {
  if (!output) return false

  const agentStatus = detectAgentStatus(output)

  if (agentStatus === 'awaiting') {
    console.log('[QuestionHandler] Agent signaled AWAITING_INPUT - waiting for user')
    return true
  }

  if (agentStatus === 'ready') {
    console.log('[QuestionHandler] Agent signaled READY_TO_PROCEED - continuing')
  }

  return false
}

/**
 * Extract the question context from output (last 1000 chars, ANSI stripped)
 */
export function extractQuestionContext(output: string): string {
  return stripAnsi(output.slice(-1000))
}
