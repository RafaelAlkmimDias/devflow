import { powerSaveBlocker } from 'electron'

/**
 * Service for managing system power state.
 * Prevents the system from sleeping/hibernating during long-running tasks.
 */
class PowerService {
  private blockerId: number | null = null

  /**
   * Start blocking system sleep.
   * Uses 'prevent-app-suspension' which prevents:
   * - System sleep
   * - App suspension (on macOS)
   *
   * Note: This does NOT prevent display sleep (screen dimming).
   * Use 'prevent-display-sleep' if you also need to keep the screen on.
   */
  startBlocking(): boolean {
    if (this.blockerId !== null) {
      // Already blocking
      return true
    }

    try {
      // 'prevent-app-suspension' - prevents system sleep but allows display to sleep
      // 'prevent-display-sleep' - prevents both system and display sleep (more aggressive)
      this.blockerId = powerSaveBlocker.start('prevent-app-suspension')
      console.log('[PowerService] Started power save blocker, id:', this.blockerId)
      return true
    } catch (error) {
      console.error('[PowerService] Failed to start power save blocker:', error)
      return false
    }
  }

  /**
   * Stop blocking system sleep.
   */
  stopBlocking(): void {
    if (this.blockerId === null) {
      return
    }

    try {
      powerSaveBlocker.stop(this.blockerId)
      console.log('[PowerService] Stopped power save blocker, id:', this.blockerId)
      this.blockerId = null
    } catch (error) {
      console.error('[PowerService] Failed to stop power save blocker:', error)
    }
  }

  /**
   * Check if currently blocking sleep.
   */
  isBlocking(): boolean {
    if (this.blockerId === null) {
      return false
    }
    return powerSaveBlocker.isStarted(this.blockerId)
  }
}

// Singleton instance
export const powerService = new PowerService()
