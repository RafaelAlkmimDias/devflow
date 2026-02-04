import { ipcMain, BrowserWindow } from 'electron'
import { terminalService } from '../application/TerminalService'

/**
 * Register IPC handlers for terminal operations.
 * Handlers delegate to TerminalService for actual operations.
 */
export function registerTerminalHandlers(getMainWindow: () => BrowserWindow | null): void {
  // Set up the main window getter for the service
  terminalService.setMainWindowGetter(getMainWindow)

  // Create terminal session
  ipcMain.handle(
    'terminal:create',
    async (_, sessionId: string, cwd: string, cols?: number, rows?: number) => {
      return terminalService.create(sessionId, cwd, cols, rows)
    }
  )

  // Write to terminal
  ipcMain.handle('terminal:write', async (_, sessionId: string, data: string) => {
    return terminalService.write(sessionId, data)
  })

  // Resize terminal
  ipcMain.handle('terminal:resize', async (_, sessionId: string, cols: number, rows: number) => {
    return terminalService.resize(sessionId, cols, rows)
  })

  // Destroy terminal session
  ipcMain.handle('terminal:destroy', async (_, sessionId: string) => {
    return terminalService.destroy(sessionId)
  })

  // Get terminal buffer
  ipcMain.handle('terminal:getBuffer', async (_, sessionId: string) => {
    return terminalService.getBuffer(sessionId)
  })
}

/**
 * Cleanup all terminals on app quit
 */
export function cleanupTerminals(): void {
  terminalService.cleanupAll()
}
