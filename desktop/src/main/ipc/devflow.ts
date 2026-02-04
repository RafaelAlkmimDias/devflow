import { ipcMain } from 'electron'
import { devFlowService, DevFlowStatus } from '../application/DevFlowService'

// Re-export types for consumers
export type { DevFlowStatus } from '../application/DevFlowService'

/**
 * Register IPC handlers for DevFlow project management.
 * Handlers delegate to DevFlowService for actual operations.
 */
export function registerDevFlowHandlers(): void {
  // Check if a project has DevFlow setup
  ipcMain.handle('devflow:check', async (_, projectPath: string): Promise<DevFlowStatus> => {
    return devFlowService.check(projectPath)
  })

  // Setup DevFlow in a project (copy all required files)
  ipcMain.handle('devflow:setup', async (_, projectPath: string): Promise<{ success: boolean; error?: string }> => {
    return devFlowService.setup(projectPath)
  })
}
