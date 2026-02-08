import { ipcMain } from 'electron'
import { Spec } from '../../shared/types'
import { specsService } from '../application/SpecsService'

/**
 * Register IPC handlers for specs/stories/ADR operations.
 * Handlers delegate to SpecsService for actual operations.
 */
export function registerSpecsHandlers(): void {
  // Parse specs from project
  ipcMain.handle('specs:parse', async (_, projectPath: string): Promise<Spec[]> => {
    return specsService.parse(projectPath)
  })

  // Update task status in markdown file
  ipcMain.handle(
    'specs:updateTaskStatus',
    async (_, params: { filePath: string; taskText: string; completed?: boolean; status?: 'completed' | 'pending' | 'blocked' }): Promise<boolean> => {
      return specsService.updateTaskStatus(params)
    }
  )
}
