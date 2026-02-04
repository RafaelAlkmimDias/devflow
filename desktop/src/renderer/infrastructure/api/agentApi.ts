import type { AutopilotStreamData } from '@shared/types'

/**
 * Autopilot agent API operations
 */
export const agentApi = {
  execute: (agent: string, prompt: string, cwd: string): Promise<string> => {
    return window.electronAPI.executeAgent(agent, prompt, cwd)
  },

  respond: (agent: string, response: string): Promise<void> => {
    return window.electronAPI.respondToAgent(agent, response)
  },

  cancel: (agent: string): Promise<void> => {
    return window.electronAPI.cancelAgent(agent)
  },

  onStream: (callback: (data: AutopilotStreamData) => void): (() => void) => {
    return window.electronAPI.onAutopilotStream(callback)
  },
}
