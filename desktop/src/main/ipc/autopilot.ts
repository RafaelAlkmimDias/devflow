import { ipcMain, BrowserWindow } from 'electron'
import { existsSync, readdirSync } from 'fs'
import { join } from 'path'
import os from 'os'
import * as pty from 'node-pty'
import { AgentType } from '../../shared/types'

// Store active PTY processes for sending responses
const activePtyProcesses: Map<string, pty.IPty> = new Map()

// Helper to send streaming output to renderer
function sendToRenderer(channel: string, data: unknown): void {
  const windows = BrowserWindow.getAllWindows()
  for (const win of windows) {
    win.webContents.send(channel, data)
  }
}

// Map agent types to Claude Code skills
const AGENT_SKILLS: Record<AgentType, string> = {
  strategist: '/agents:strategist',
  architect: '/agents:architect',
  builder: '/agents:builder',
  guardian: '/agents:guardian',
  chronicler: '/agents:chronicler',
}

// Patterns that indicate Claude is waiting for user input
const QUESTION_PATTERNS = [
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

// Detect if output contains a question waiting for response
function detectQuestion(text: string): boolean {
  // Check the last 500 chars for question patterns
  const recentText = text.slice(-500)
  return QUESTION_PATTERNS.some(pattern => pattern.test(recentText))
}

// Get extended PATH including nvm, homebrew, etc.
function getExtendedPath(): string {
  const home = os.homedir()
  const paths: string[] = []

  // Add nvm paths (find all installed node versions)
  const nvmDir = join(home, '.nvm', 'versions', 'node')
  if (existsSync(nvmDir)) {
    try {
      const versions = readdirSync(nvmDir)
      for (const version of versions) {
        const binPath = join(nvmDir, version, 'bin')
        if (existsSync(binPath)) {
          paths.push(binPath)
        }
      }
    } catch {
      // Ignore errors reading nvm directory
    }
  }

  // Add common paths
  paths.push('/usr/local/bin')
  paths.push('/opt/homebrew/bin')
  paths.push(join(home, '.local', 'bin'))
  paths.push(join(home, 'bin'))

  // Add existing PATH
  if (process.env.PATH) {
    paths.push(process.env.PATH)
  }
  return paths.join(':')
}

export function registerAutopilotHandlers(): void {
  // Execute agent
  ipcMain.handle(
    'autopilot:execute',
    async (_, agent: string, prompt: string, cwd: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        const skill = AGENT_SKILLS[agent as AgentType]

        if (!skill) {
          reject(new Error(`Unknown agent: ${agent}`))
          return
        }

        // Build the command - use skill invocation with prompt
        const fullPrompt = `${skill} ${prompt}`

        console.log('[Autopilot] Starting agent:', agent)
        console.log('[Autopilot] Working directory:', cwd)
        console.log('[Autopilot] Prompt length:', fullPrompt.length)

        // Send initial status
        sendToRenderer('autopilot:stream', { agent, type: 'start' })
        sendToRenderer('autopilot:stream', { agent, type: 'stdout', data: `Starting ${agent} agent...\n` })

        // Use node-pty to spawn with a pseudo-terminal (forces unbuffered output)
        // Escape the prompt for shell - use base64 to avoid quote issues
        // Use --allowedTools to pre-approve common file operations
        const allowedTools = 'Edit,Write,Read,Glob,Grep,Bash'
        const promptBase64 = Buffer.from(fullPrompt).toString('base64')
        const ptyProcess = pty.spawn('bash', ['-c', `echo "${promptBase64}" | base64 -d | claude -p --allowedTools "${allowedTools}" -`], {
          name: 'xterm-color',
          cols: 120,
          rows: 30,
          cwd,
          env: {
            ...process.env,
            PATH: getExtendedPath(),
            TERM: 'xterm-256color',
          } as Record<string, string>,
        })

        console.log('[Autopilot] PTY Process PID:', ptyProcess.pid)

        // Store the process for sending responses
        activePtyProcesses.set(agent, ptyProcess)

        let output = ''
        let questionBuffer = ''
        let questionTimeout: NodeJS.Timeout | null = null

        ptyProcess.onData((data: string) => {
          output += data
          questionBuffer += data
          console.log('[Autopilot] pty data:', data.substring(0, 200))

          // Stream to renderer
          sendToRenderer('autopilot:stream', { agent, type: 'stdout', data })

          // Check for questions with a small delay to accumulate text
          if (questionTimeout) {
            clearTimeout(questionTimeout)
          }

          questionTimeout = setTimeout(() => {
            if (detectQuestion(questionBuffer)) {
              console.log('[Autopilot] Question detected, waiting for user input')
              sendToRenderer('autopilot:stream', {
                agent,
                type: 'question',
                data: questionBuffer.slice(-500) // Send recent context
              })
            }
            questionBuffer = '' // Reset buffer after check
          }, 500) // Wait 500ms for more text before checking
        })

        ptyProcess.onExit(({ exitCode }) => {
          console.log('[Autopilot] Process exited with code:', exitCode)
          console.log('[Autopilot] Output length:', output.length)

          // Clean up
          activePtyProcesses.delete(agent)
          if (questionTimeout) {
            clearTimeout(questionTimeout)
          }

          if (exitCode === 0) {
            resolve(output)
          } else {
            reject(new Error(`Process exited with code ${exitCode}`))
          }
        })

        // Timeout after 15 minutes
        const timeout = setTimeout(() => {
          console.log('[Autopilot] TIMEOUT - killing process')
          ptyProcess.kill()
          reject(new Error('Agent execution timed out'))
        }, 15 * 60 * 1000)

        ptyProcess.onExit(() => {
          clearTimeout(timeout)
        })
      })
    }
  )

  // Handle user response to agent question
  ipcMain.handle(
    'autopilot:respond',
    async (_, agent: string, response: string): Promise<void> => {
      const ptyProcess = activePtyProcesses.get(agent)

      if (!ptyProcess) {
        throw new Error(`No active process for agent: ${agent}`)
      }

      console.log('[Autopilot] Sending user response to', agent, ':', response.substring(0, 100))

      // Send the response to the PTY process
      ptyProcess.write(response + '\n')

      // Notify renderer that response was sent
      sendToRenderer('autopilot:stream', { agent, type: 'response-sent', data: response })
    }
  )

  // Cancel/kill agent execution
  ipcMain.handle(
    'autopilot:cancel',
    async (_, agent: string): Promise<void> => {
      const ptyProcess = activePtyProcesses.get(agent)

      if (ptyProcess) {
        console.log('[Autopilot] Cancelling agent:', agent)
        ptyProcess.kill()
        activePtyProcesses.delete(agent)
      }
    }
  )
}
