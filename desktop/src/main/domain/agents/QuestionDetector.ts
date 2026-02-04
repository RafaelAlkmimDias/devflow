/**
 * Patterns that indicate Claude is waiting for user input.
 * Used in the main process to detect questions from agent output.
 */
export const QUESTION_PATTERNS = [
  /\?\s*$/m,                           // Ends with question mark
  /please (confirm|choose|select|specify)/i,
  /would you like/i,
  /do you want/i,
  /which (one|option)/i,
  /enter your/i,
  /type your/i,
  /\[Y\/n\]/i,                         // Yes/No prompt
  /\[y\/N\]/i,
  /\(yes\/no\)/i,
  /press enter/i,
  /waiting for input/i,
  /\>\s*$/m,                           // Ends with prompt character
]

/**
 * Detect if output contains a question waiting for response.
 * Checks the last 500 chars for question patterns.
 */
export function detectQuestion(text: string): boolean {
  const recentText = text.slice(-500)
  return QUESTION_PATTERNS.some(pattern => pattern.test(recentText))
}
