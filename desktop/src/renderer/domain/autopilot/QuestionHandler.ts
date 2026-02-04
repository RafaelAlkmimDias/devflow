/**
 * Agent status markers - explicit signals from agents about whether to proceed or wait.
 * All agents MUST return one of these markers at the end of their response.
 */
const STATUS_MARKERS = {
  READY_TO_PROCEED: /\[STATUS:\s*READY_TO_PROCEED\]/i,
  AWAITING_INPUT: /\[STATUS:\s*AWAITING_INPUT\]/i,
}

/**
 * Detect agent status marker in output.
 * Returns: 'ready' | 'awaiting' | null
 */
export function detectAgentStatus(output: string): 'ready' | 'awaiting' | null {
  if (!output) return null

  // Check last 300 chars for status marker (should be at the end)
  const recentOutput = output.slice(-300)

  if (STATUS_MARKERS.AWAITING_INPUT.test(recentOutput)) {
    console.log('[QuestionHandler] Status marker detected: AWAITING_INPUT')
    return 'awaiting'
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
 * Extract the question context from output (last 500 chars)
 */
export function extractQuestionContext(output: string): string {
  return output.slice(-500)
}
