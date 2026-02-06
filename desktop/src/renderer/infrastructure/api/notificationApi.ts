/**
 * API for native OS notifications.
 * Used to alert users when autopilot needs attention.
 */
export const notificationApi = {
  /**
   * Notify that autopilot completed successfully
   */
  notifyCompleted: async (agentName?: string): Promise<void> => {
    return window.electronAPI.notifyCompleted(agentName)
  },

  /**
   * Notify that autopilot failed
   */
  notifyFailed: async (error?: string): Promise<void> => {
    return window.electronAPI.notifyFailed(error)
  },

  /**
   * Notify that an agent has a question
   */
  notifyQuestion: async (agentName: string): Promise<void> => {
    return window.electronAPI.notifyQuestion(agentName)
  },

  /**
   * Notify that autopilot is awaiting user input
   */
  notifyAwaitingInput: async (agentName: string): Promise<void> => {
    return window.electronAPI.notifyAwaitingInput(agentName)
  },
}
