/**
 * Question patterns in Portuguese and English for detecting agent questions.
 * These patterns are used to detect when an agent is asking for user input.
 */
const QUESTION_PATTERNS = [
  // Portuguese patterns
  /deseja\s+(que|continuar|esclarecer|saber|algum)/i,
  /gostaria\s+(de|que)/i,
  /quer\s+(que|saber|algum)/i,
  /precisa\s+(de|que|algum)/i,
  /posso\s+(continuar|prosseguir|esclarecer|chamar)/i,
  /devo\s+(continuar|prosseguir)/i,
  /confirmar\s+(se|que|os|as)/i,
  /algum(a)?\s+(desses|dessas|dúvida|pergunta)/i,
  /esclareça\s+algum/i,
  /chamar\s+o\s+@/i,
  /próximos?\s+passos?/i,

  // English patterns
  /would\s+you\s+like/i,
  /do\s+you\s+want/i,
  /should\s+i/i,
  /shall\s+i/i,
  /can\s+i/i,
]

/**
 * Detect if output ends with a question requiring user input.
 * Analyzes the last few lines of output for question marks and patterns.
 */
export function outputEndsWithQuestion(output: string): boolean {
  if (!output) return false

  // Get the last meaningful lines (ignoring empty lines at the end)
  const lines = output.trim().split('\n').filter(line => line.trim())
  if (lines.length === 0) return false

  // Get last 10 lines for analysis
  const lastLines = lines.slice(-10)
  const lastLinesText = lastLines.join('\n').toLowerCase()

  // Check if any of the last 5 lines ends with a question mark
  const lastFiveLines = lines.slice(-5)
  const hasQuestionMark = lastFiveLines.some(line => {
    const trimmed = line.trim()
    // Remove markdown formatting at the end
    const cleaned = trimmed.replace(/[\*_`]+$/, '').trim()
    return cleaned.endsWith('?')
  })

  if (hasQuestionMark) {
    console.log('[QuestionHandler] Question detected: line ends with ?')
    return true
  }

  // Check for common question patterns
  const hasQuestionPattern = QUESTION_PATTERNS.some(pattern => pattern.test(lastLinesText))

  if (hasQuestionPattern) {
    console.log('[QuestionHandler] Question detected: pattern match')
    return true
  }

  return false
}

/**
 * Extract the question context from output (last 500 chars)
 */
export function extractQuestionContext(output: string): string {
  return output.slice(-500)
}
