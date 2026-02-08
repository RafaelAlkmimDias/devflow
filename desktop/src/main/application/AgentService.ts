import { BrowserWindow } from 'electron'
import * as pty from 'node-pty'
import { AgentType } from '../../shared/types'
import { getExtendedPath } from '../domain/common/PathUtils'
import { AGENT_SKILLS, DEFAULT_ALLOWED_TOOLS, AGENT_EXECUTION_TIMEOUT } from '../domain/agents/constants'
import { detectQuestion } from '../domain/agents/QuestionDetector'

export interface AgentExecutionResult {
  output: string
  exitCode: number
}

export interface AgentStreamEvent {
  agent: string
  type: 'start' | 'stdout' | 'question' | 'response-sent' | 'exit'
  data?: string
}

/**
 * Service responsible for agent execution via PTY.
 *
 * Single-session optimization: uses `claude -p --continue` so each agent
 * continues the previous conversation. Context is maintained server-side
 * by the Claude API, so agents 2+ don't need to resend spec/previous outputs.
 *
 * Agent 1: `claude -p "prompt" --allowedTools "..."`
 * Agent 2+: `claude -p --continue "prompt" --allowedTools "..."`
 */
export class AgentService {
  private activePtyProcesses: Map<string, pty.IPty> = new Map()
  private questionTimeouts: Map<string, NodeJS.Timeout> = new Map()

  // Session state: tracks whether first agent has been sent (for --continue)
  private sessionCwd: string | null = null
  private sessionStarted: boolean = false

  /**
   * Send streaming event to all renderer windows
   */
  private sendToRenderer(channel: string, data: unknown): void {
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      win.webContents.send(channel, data)
    }
  }

  // ─── Single-Session API ────────────────────────────────────────

  /**
   * Start a session for an autopilot run.
   * Just records the cwd — the actual PTY is spawned per-agent in sendPrompt().
   */
  async startSession(cwd: string): Promise<void> {
    console.log('[AgentService] Starting session for:', cwd)
    this.sessionCwd = cwd
    this.sessionStarted = false
  }

  /**
   * Send a prompt to an agent. Uses `claude -p` for the first agent,
   * `claude -p --continue` for subsequent agents to maintain context.
   * Each agent runs as a separate process (reliable exit detection).
   */
  async sendPrompt(agent: string, prompt: string): Promise<string> {
    if (!this.sessionCwd) {
      throw new Error('No active session. Call startSession() first.')
    }

    const cwd = this.sessionCwd
    const useContinue = this.sessionStarted

    // Mark session as started after first agent
    this.sessionStarted = true

    console.log('[AgentService] sendPrompt agent:', agent, 'continue:', useContinue)
    console.log('[AgentService] Prompt length:', prompt.length)

    return this.executeInternal(agent as AgentType, prompt, cwd, useContinue)
  }

  /**
   * Send a user response as a continuation of the current conversation.
   * Used when an agent emits AWAITING_INPUT.
   */
  async sendResponse(response: string): Promise<void> {
    if (!this.sessionCwd) {
      throw new Error('No active session')
    }

    // If there's an active PTY for an agent, write directly to it
    for (const [agent, ptyProcess] of this.activePtyProcesses) {
      console.log('[AgentService] Sending user response to active agent:', agent)
      ptyProcess.write(response + '\n')
      this.sendToRenderer('autopilot:stream', { agent, type: 'response-sent', data: response })
      return
    }

    throw new Error('No active agent to respond to')
  }

  /**
   * Cancel the current agent by killing its process.
   */
  cancelCurrentAgent(): void {
    for (const [agent, ptyProcess] of this.activePtyProcesses) {
      console.log('[AgentService] Cancelling current agent:', agent)
      ptyProcess.kill()
      this.cleanupAgent(agent)
      return
    }
  }

  /**
   * End the session.
   */
  endSession(): void {
    console.log('[AgentService] Ending session')
    // Kill any running agents
    for (const [agent, ptyProcess] of this.activePtyProcesses) {
      try {
        ptyProcess.kill()
      } catch { /* ignore */ }
      this.cleanupAgent(agent)
    }
    this.sessionCwd = null
    this.sessionStarted = false
  }

  /**
   * Check if a session is currently active
   */
  isSessionActive(): boolean {
    return this.sessionCwd !== null
  }

  // ─── Core execution (shared by session and legacy APIs) ────────

  /**
   * Execute an agent via PTY. Optionally uses --continue to maintain context.
   */
  private executeInternal(
    agent: AgentType,
    prompt: string,
    cwd: string,
    useContinue: boolean
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const skill = AGENT_SKILLS[agent]

      if (!skill) {
        reject(new Error(`Unknown agent: ${agent}`))
        return
      }

      const fullPrompt = `${skill} ${prompt}`

      console.log('[AgentService] Starting agent:', agent)
      console.log('[AgentService] Working directory:', cwd)
      console.log('[AgentService] Prompt length:', fullPrompt.length)
      console.log('[AgentService] Using --continue:', useContinue)

      // Send initial status
      this.sendToRenderer('autopilot:stream', { agent, type: 'start' })
      this.sendToRenderer('autopilot:stream', { agent, type: 'stdout', data: `Starting ${agent} agent...\n` })

      // Use base64 encoding to avoid shell escaping issues
      const promptBase64 = Buffer.from(fullPrompt).toString('base64')
      const continueFlag = useContinue ? ' --continue' : ''
      const cmd = `echo "${promptBase64}" | base64 -d | claude -p${continueFlag} --allowedTools "${DEFAULT_ALLOWED_TOOLS}" -`

      console.log('[AgentService] Command:', cmd.substring(0, 200))

      const ptyProcess = pty.spawn(
        'bash',
        ['-c', cmd],
        {
          name: 'xterm-color',
          cols: 120,
          rows: 30,
          cwd,
          env: {
            ...process.env,
            PATH: getExtendedPath(),
            TERM: 'xterm-256color',
          } as Record<string, string>,
        }
      )

      console.log('[AgentService] PTY Process PID:', ptyProcess.pid)

      this.activePtyProcesses.set(agent, ptyProcess)

      let output = ''
      let questionBuffer = ''

      ptyProcess.onData((data: string) => {
        output += data
        questionBuffer += data
        console.log('[AgentService] pty data:', data.substring(0, 200))

        this.sendToRenderer('autopilot:stream', { agent, type: 'stdout', data })

        // Debounce question detection
        this.clearQuestionTimeout(agent)
        const timeout = setTimeout(() => {
          // Guard: skip if agent process already exited
          if (!this.activePtyProcesses.has(agent)) return

          if (detectQuestion(questionBuffer)) {
            console.log('[AgentService] Question detected, waiting for user input')
            this.sendToRenderer('autopilot:stream', {
              agent,
              type: 'question',
              data: questionBuffer.slice(-500),
            })
          }
          questionBuffer = ''
        }, 500)
        this.questionTimeouts.set(agent, timeout)
      })

      // Set execution timeout
      const executionTimeout = setTimeout(() => {
        console.log('[AgentService] TIMEOUT - killing process')
        ptyProcess.kill()
        reject(new Error('Agent execution timed out'))
      }, AGENT_EXECUTION_TIMEOUT)

      ptyProcess.onExit(({ exitCode }) => {
        // Clear execution timeout FIRST to prevent race condition
        clearTimeout(executionTimeout)
        this.clearQuestionTimeout(agent)
        this.activePtyProcesses.delete(agent)

        try {
          console.log('[AgentService] Process exited with code:', exitCode)
          console.log('[AgentService] Output length:', output.length)

          // Check for question in remaining buffer
          if (questionBuffer.length > 0 && detectQuestion(questionBuffer)) {
            console.log('[AgentService] Question detected at exit, sending to renderer')
            this.sendToRenderer('autopilot:stream', {
              agent,
              type: 'question',
              data: questionBuffer.slice(-500),
            })
          }
        } catch {
          // Ignore EPIPE errors from console.log during shutdown
        }

        if (exitCode === 0) {
          resolve(output)
        } else {
          reject(new Error(`Process exited with code ${exitCode}`))
        }
      })
    })
  }

  // ─── Legacy API (kept for backward compatibility) ──────────────

  /**
   * Execute an agent with the given prompt in the specified directory.
   * @deprecated Use startSession + sendPrompt instead
   */
  async execute(agent: AgentType, prompt: string, cwd: string): Promise<string> {
    return this.executeInternal(agent, prompt, cwd, false)
  }

  /**
   * Send a response to an active agent's PTY process
   * @deprecated Use sendResponse instead
   */
  async respond(agent: string, response: string): Promise<void> {
    const ptyProcess = this.activePtyProcesses.get(agent)

    if (!ptyProcess) {
      throw new Error(`No active process for agent: ${agent}`)
    }

    console.log('[AgentService] Sending user response to', agent, ':', response.substring(0, 100))

    ptyProcess.write(response + '\n')

    this.sendToRenderer('autopilot:stream', { agent, type: 'response-sent', data: response })
  }

  /**
   * Cancel/kill an agent's execution
   * @deprecated Use cancelCurrentAgent instead
   */
  async cancel(agent: string): Promise<void> {
    const ptyProcess = this.activePtyProcesses.get(agent)

    if (ptyProcess) {
      console.log('[AgentService] Cancelling agent:', agent)
      ptyProcess.kill()
      this.cleanupAgent(agent)
    }
  }

  /**
   * Check if an agent is currently running
   */
  isRunning(agent: string): boolean {
    return this.activePtyProcesses.has(agent)
  }

  // ─── Internal helpers ──────────────────────────────────────────

  /**
   * Clean up resources for an agent
   */
  private cleanupAgent(agent: string): void {
    this.activePtyProcesses.delete(agent)
    this.clearQuestionTimeout(agent)
  }

  /**
   * Clear the question detection timeout for an agent
   */
  private clearQuestionTimeout(agent: string): void {
    const timeout = this.questionTimeouts.get(agent)
    if (timeout) {
      clearTimeout(timeout)
      this.questionTimeouts.delete(agent)
    }
  }

  /**
   * Clean up all active processes (for app shutdown)
   */
  cleanupAll(): void {
    for (const [agent, ptyProcess] of this.activePtyProcesses) {
      try {
        ptyProcess.kill()
      } catch (error) {
        console.error(`[AgentService] Failed to cleanup agent ${agent}:`, error)
      }
    }
    this.activePtyProcesses.clear()

    for (const timeout of this.questionTimeouts.values()) {
      clearTimeout(timeout)
    }
    this.questionTimeouts.clear()

    this.sessionCwd = null
    this.sessionStarted = false
  }
}

// Singleton instance
export const agentService = new AgentService()
