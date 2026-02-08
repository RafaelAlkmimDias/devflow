import type { Spec } from '@shared/types'

/**
 * Specs/Stories/ADRs API operations
 */
export const specsApi = {
  parse: (projectPath: string): Promise<Spec[]> => {
    return window.electronAPI.parseSpecs(projectPath)
  },

  updateTaskStatus: (filePath: string, taskText: string, completed: boolean, status?: string): Promise<boolean> => {
    return window.electronAPI.updateTaskStatus(filePath, taskText, completed, status)
  },
}
