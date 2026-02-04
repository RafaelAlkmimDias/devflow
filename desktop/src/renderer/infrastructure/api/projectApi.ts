/**
 * Project and dialog API operations
 */
export const projectApi = {
  selectDirectory: (): Promise<string | null> => {
    return window.electronAPI.selectDirectory()
  },

  getRecentProjects: (): Promise<string[]> => {
    return window.electronAPI.getRecentProjects()
  },

  addRecentProject: (projectPath: string): Promise<void> => {
    return window.electronAPI.addRecentProject(projectPath)
  },

  removeRecentProject: (projectPath: string): Promise<void> => {
    return window.electronAPI.removeRecentProject(projectPath)
  },
}
