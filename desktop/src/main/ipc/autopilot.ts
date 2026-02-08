import { ipcMain } from 'electron'
import { AgentType } from '../../shared/types'
import { agentService } from '../application/AgentService'

/**
 * Register IPC handlers for autopilot agent execution.
 * Handlers delegate to AgentService for actual execution.
 */
export function registerAutopilotHandlers(): void {
  // ─── Single-session API (new) ────────────────────────────────

  // Start a persistent Claude CLI session
  ipcMain.handle(
    'autopilot:startSession',
    async (_, cwd: string): Promise<void> => {
      return agentService.startSession(cwd)
    }
  )

  // Send a prompt to an agent within the active session
  ipcMain.handle(
    'autopilot:sendPrompt',
    async (_, agent: string, prompt: string): Promise<string> => {
      return agentService.sendPrompt(agent, prompt)
    }
  )

  // Send a user response to the active agent
  ipcMain.handle(
    'autopilot:sendResponse',
    async (_, response: string): Promise<void> => {
      return agentService.sendResponse(response)
    }
  )

  // Cancel the current agent (Ctrl+C, session stays alive)
  ipcMain.handle(
    'autopilot:cancelCurrentAgent',
    async (): Promise<void> => {
      agentService.cancelCurrentAgent()
    }
  )

  // End the persistent session
  ipcMain.handle(
    'autopilot:endSession',
    async (): Promise<void> => {
      agentService.endSession()
    }
  )

  // ─── Legacy API (kept for backward compatibility) ────────────

  // Execute agent (legacy: one PTY per agent)
  ipcMain.handle(
    'autopilot:execute',
    async (_, agent: string, prompt: string, cwd: string): Promise<string> => {
      return agentService.execute(agent as AgentType, prompt, cwd)
    }
  )

  // Handle user response to agent question (legacy)
  ipcMain.handle(
    'autopilot:respond',
    async (_, agent: string, response: string): Promise<void> => {
      return agentService.respond(agent, response)
    }
  )

  // Cancel/kill agent execution (legacy)
  ipcMain.handle(
    'autopilot:cancel',
    async (_, agent: string): Promise<void> => {
      return agentService.cancel(agent)
    }
  )
}

/**
 * Cleanup all agent processes (call on app quit)
 */
export function cleanupAutopilot(): void {
  agentService.cleanupAll()
}
