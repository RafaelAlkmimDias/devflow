import { BrowserWindow, ipcMain, app, dialog, shell } from 'electron'
import Store from 'electron-store'
import { registerFileHandlers } from './files'
import { registerTerminalHandlers } from './terminal'
import { registerGitHandlers } from './git'
import { registerSearchHandlers } from './search'
import { registerSpecsHandlers } from './specs'
import { registerAutopilotHandlers } from './autopilot'
import { registerDevFlowHandlers } from './devflow'
import { registerRequirementsHandlers } from './requirements'

const store = new Store<{ recentProjects: string[] }>({
  name: 'projects',
  defaults: {
    recentProjects: [],
  },
})

export function registerAllHandlers(getMainWindow: () => BrowserWindow | null): void {
  // Register domain-specific handlers
  registerFileHandlers()
  registerTerminalHandlers(getMainWindow)
  registerGitHandlers()
  registerSearchHandlers()
  registerSpecsHandlers()
  registerAutopilotHandlers()
  registerDevFlowHandlers()
  registerRequirementsHandlers()

  // Dialog handlers
  ipcMain.handle('dialog:selectDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Project Directory',
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })

  // Project handlers
  ipcMain.handle('project:getRecent', () => {
    return store.get('recentProjects', [])
  })

  ipcMain.handle('project:addRecent', (_, projectPath: string) => {
    const recent = store.get('recentProjects', [])
    const filtered = recent.filter((p) => p !== projectPath)
    const updated = [projectPath, ...filtered].slice(0, 10) // Keep max 10 recent
    store.set('recentProjects', updated)
  })

  ipcMain.handle('project:removeRecent', (_, projectPath: string) => {
    const recent = store.get('recentProjects', [])
    const filtered = recent.filter((p) => p !== projectPath)
    store.set('recentProjects', filtered)
  })

  // App handlers
  ipcMain.handle('app:version', () => {
    return app.getVersion()
  })

  ipcMain.handle('app:openExternal', async (_, url: string) => {
    await shell.openExternal(url)
  })
}
