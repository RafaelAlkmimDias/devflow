import { ipcMain } from 'electron'
import { requirementsService, Requirement, RequirementsStatus } from '../application/RequirementsService'

// Re-export types
export type { Requirement, RequirementsStatus } from '../application/RequirementsService'

/**
 * Register IPC handlers for system requirements checking.
 * Handlers delegate to RequirementsService for actual operations.
 */
export function registerRequirementsHandlers(): void {
  // Check all system requirements
  ipcMain.handle('requirements:check', async (): Promise<RequirementsStatus> => {
    return requirementsService.check()
  })

  // Re-check a single requirement
  ipcMain.handle('requirements:recheck', async (_, requirementId: string): Promise<Requirement | null> => {
    return requirementsService.recheck(requirementId)
  })

  // Open URL in default browser
  ipcMain.handle('requirements:openHelp', async (_, url: string): Promise<void> => {
    return requirementsService.openHelp(url)
  })
}
