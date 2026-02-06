/**
 * API for managing system power state.
 * Prevents the system from sleeping during long-running autopilot tasks.
 */
export const powerApi = {
  /**
   * Start blocking system sleep/hibernation.
   * Call this when autopilot starts running.
   */
  startBlocking: async (): Promise<boolean> => {
    return window.electronAPI.powerStartBlocking()
  },

  /**
   * Stop blocking system sleep.
   * Call this when autopilot finishes or is interrupted.
   */
  stopBlocking: async (): Promise<void> => {
    return window.electronAPI.powerStopBlocking()
  },

  /**
   * Check if currently blocking sleep.
   */
  isBlocking: async (): Promise<boolean> => {
    return window.electronAPI.powerIsBlocking()
  },
}
