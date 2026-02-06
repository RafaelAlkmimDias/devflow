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
 * Manages the lifecycle of agent processes and streaming output.
 */
export class AgentService {
  private activePtyProcesses: Map<string, pty.IPty> = new Map()
  private questionTimeouts: Map<string, NodeJS.Timeout> = new Map()

  /**
   * Send streaming event to all renderer windows
   */
  private sendToRenderer(channel: string, data: unknown): void {
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      win.webContents.send(channel, data)
    }
  }

  /**
   * Execute an agent with the given prompt in the specified directory.
   * Returns a promise that resolves with the agent's output.
   */
  async execute(agent: AgentType, prompt: string, cwd: string): Promise<string> {
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

      // Send initial status
      this.sendToRenderer('autopilot:stream', { agent, type: 'start' })
      this.sendToRenderer('autopilot:stream', { agent, type: 'stdout', data: `Starting ${agent} agent...\n` })

      // Use base64 encoding to avoid shell escaping issues
      const promptBase64 = Buffer.from(fullPrompt).toString('base64')
      const ptyProcess = pty.spawn(
        'bash',
        ['-c', `echo "${promptBase64}" | base64 -d | claude -p --allowedTools "${DEFAULT_ALLOWED_TOOLS}" -`],
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

      ptyProcess.onExit(({ exitCode }) => {
        // Clear pending question timeout FIRST to prevent race condition
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

      // Set execution timeout
      const executionTimeout = setTimeout(() => {
        console.log('[AgentService] TIMEOUT - killing process')
        ptyProcess.kill()
        reject(new Error('Agent execution timed out'))
      }, AGENT_EXECUTION_TIMEOUT)

      ptyProcess.onExit(() => {
        clearTimeout(executionTimeout)
      })
    })
  }

  /**
   * Send a response to an active agent's PTY process
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
   */
  async cancel(agent: string): Promise<void> {
    const ptyProcess = this.activePtyProcesses.get(agent)

    if (ptyProcess) {
      console.log('[AgentService] Cancelling agent:', agent)
      ptyProcess.kill()
      this.cleanup(agent)
    }
  }

  /**
   * Check if an agent is currently running
   */
  isRunning(agent: string): boolean {
    return this.activePtyProcesses.has(agent)
  }

  /**
   * Clean up resources for an agent
   */
  private cleanup(agent: string): void {
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
  }
}

// Singleton instance
export const agentService = new AgentService()
