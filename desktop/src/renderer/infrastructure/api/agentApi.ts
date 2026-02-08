import type { AutopilotStreamData } from '@shared/types'

/**
 * Autopilot agent API operations
 */
export const agentApi = {
  // ─── Single-session API (new) ────────────────────────────────

  startSession: (cwd: string): Promise<void> => {
    return window.electronAPI.startAutopilotSession(cwd)
  },

  sendPrompt: (agent: string, prompt: string): Promise<string> => {
    return window.electronAPI.sendAgentPrompt(agent, prompt)
  },

  sendResponse: (response: string): Promise<void> => {
    return window.electronAPI.sendAgentResponse(response)
  },

  cancelCurrentAgent: (): Promise<void> => {
    return window.electronAPI.cancelCurrentAgent()
  },

  endSession: (): Promise<void> => {
    return window.electronAPI.endAutopilotSession()
  },

  // ─── Legacy API ──────────────────────────────────────────────

  execute: (agent: string, prompt: string, cwd: string): Promise<string> => {
    return window.electronAPI.executeAgent(agent, prompt, cwd)
  },

  respond: (agent: string, response: string): Promise<void> => {
    return window.electronAPI.respondToAgent(agent, response)
  },

  cancel: (agent: string): Promise<void> => {
    return window.electronAPI.cancelAgent(agent)
  },

  // ─── Shared ──────────────────────────────────────────────────

  onStream: (callback: (data: AutopilotStreamData) => void): (() => void) => {
    return window.electronAPI.onAutopilotStream(callback)
  },
}
