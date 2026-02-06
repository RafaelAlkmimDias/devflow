import { ipcMain } from 'electron'
import { powerService } from '../application/PowerService'

/**
 * Register IPC handlers for power management.
 */
export function registerPowerHandlers(): void {
  // Start blocking system sleep
  ipcMain.handle('power:startBlocking', async (): Promise<boolean> => {
    return powerService.startBlocking()
  })

  // Stop blocking system sleep
  ipcMain.handle('power:stopBlocking', async (): Promise<void> => {
    powerService.stopBlocking()
  })

  // Check if currently blocking
  ipcMain.handle('power:isBlocking', async (): Promise<boolean> => {
    return powerService.isBlocking()
  })
}
