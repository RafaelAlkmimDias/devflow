import { ipcMain } from 'electron'
import { AgentType } from '../../shared/types'
import { agentService } from '../application/AgentService'

/**
 * Register IPC handlers for autopilot agent execution.
 * Handlers delegate to AgentService for actual execution.
 */
export function registerAutopilotHandlers(): void {
  // Execute agent
  ipcMain.handle(
    'autopilot:execute',
    async (_, agent: string, prompt: string, cwd: string): Promise<string> => {
      return agentService.execute(agent as AgentType, prompt, cwd)
    }
  )

  // Handle user response to agent question
  ipcMain.handle(
    'autopilot:respond',
    async (_, agent: string, response: string): Promise<void> => {
      return agentService.respond(agent, response)
    }
  )

  // Cancel/kill agent execution
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
