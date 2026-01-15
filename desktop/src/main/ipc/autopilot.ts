import { ipcMain } from 'electron'
import { spawn } from 'child_process'
import { existsSync, readdirSync } from 'fs'
import { join } from 'path'
import os from 'os'
import { AgentType } from '../../shared/types'

// Map agent types to Claude Code skills
const AGENT_SKILLS: Record<AgentType, string> = {
  strategist: '/agents:strategist',
  architect: '/agents:architect',
  builder: '/agents:builder',
  guardian: '/agents:guardian',
  chronicler: '/agents:chronicler',
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

        // Build the command
        const fullPrompt = `${skill} ${prompt}`

        // Spawn claude process with extended PATH
        const proc = spawn('claude', ['-p', fullPrompt], {
          cwd,
          shell: true,
          env: {
            ...process.env,
            PATH: getExtendedPath(),
            TERM: 'dumb',
          },
        })

        let stdout = ''
        let stderr = ''

        proc.stdout.on('data', (data: Buffer) => {
          stdout += data.toString()
        })

        proc.stderr.on('data', (data: Buffer) => {
          stderr += data.toString()
        })

        proc.on('error', (error) => {
          reject(new Error(`Failed to start claude: ${error.message}`))
        })

        proc.on('close', (code) => {
          if (code === 0) {
            resolve(stdout)
          } else {
            reject(new Error(stderr || `Process exited with code ${code}`))
          }
        })

        // Timeout after 5 minutes
        const timeout = setTimeout(() => {
          proc.kill()
          reject(new Error('Agent execution timed out'))
        }, 5 * 60 * 1000)

        proc.on('close', () => {
          clearTimeout(timeout)
        })
      })
    }
  )
}
