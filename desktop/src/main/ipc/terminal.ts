import { ipcMain, BrowserWindow } from 'electron'
import * as pty from 'node-pty'
import os from 'os'

interface TerminalSession {
  pty: pty.IPty
  buffer: string[]
}

const sessions = new Map<string, TerminalSession>()
const MAX_BUFFER_LINES = 1000

export function registerTerminalHandlers(getMainWindow: () => BrowserWindow | null): void {
  // Create terminal session
  ipcMain.handle(
    'terminal:create',
    async (_, sessionId: string, cwd: string, cols?: number, rows?: number): Promise<{ success: boolean; message?: string }> => {
      // If session already exists, return success
      if (sessions.has(sessionId)) {
        return { success: true, message: 'Session already exists' }
      }

      try {
        // Determine shell based on platform
        const shell =
          os.platform() === 'win32'
            ? process.env.COMSPEC || 'powershell.exe'
            : process.env.SHELL || '/bin/zsh'

        // Shell arguments
        const shellArgs = os.platform() === 'win32' ? [] : ['-l'] // Login shell for Unix

        // Create PTY process
        const ptyProcess = pty.spawn(shell, shellArgs, {
          name: 'xterm-256color',
          cols: cols || 80,
          rows: rows || 24,
          cwd,
          env: {
            ...process.env,
            TERM: 'xterm-256color',
            COLORTERM: 'truecolor',
          } as { [key: string]: string },
        })

        const session: TerminalSession = {
          pty: ptyProcess,
          buffer: [],
        }

        // Handle PTY data output
        ptyProcess.onData((data: string) => {
          // Add to buffer
          session.buffer.push(data)
          if (session.buffer.length > MAX_BUFFER_LINES) {
            session.buffer.shift()
          }

          // Send to renderer
          const mainWindow = getMainWindow()
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('terminal:data', sessionId, data)
          }
        })

        // Handle PTY exit
        ptyProcess.onExit(({ exitCode }) => {
          const mainWindow = getMainWindow()
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('terminal:exit', sessionId, exitCode)
          }
          sessions.delete(sessionId)
        })

        sessions.set(sessionId, session)
        return { success: true }
      } catch (error) {
        console.error('Failed to create terminal:', error)
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }
  )

  // Write to terminal
  ipcMain.handle('terminal:write', async (_, sessionId: string, data: string): Promise<void> => {
    const session = sessions.get(sessionId)
    if (session) {
      session.pty.write(data)
    }
  })

  // Resize terminal
  ipcMain.handle(
    'terminal:resize',
    async (_, sessionId: string, cols: number, rows: number): Promise<void> => {
      const session = sessions.get(sessionId)
      if (session) {
        try {
          session.pty.resize(cols, rows)
        } catch (error) {
          console.error('Failed to resize terminal:', error)
        }
      }
    }
  )

  // Destroy terminal session
  ipcMain.handle('terminal:destroy', async (_, sessionId: string): Promise<void> => {
    const session = sessions.get(sessionId)
    if (session) {
      try {
        session.pty.kill()
      } catch (error) {
        console.error('Failed to kill terminal:', error)
      }
      sessions.delete(sessionId)
    }
  })

  // Get terminal buffer (for reconnection)
  ipcMain.handle('terminal:getBuffer', async (_, sessionId: string): Promise<string> => {
    const session = sessions.get(sessionId)
    return session ? session.buffer.join('') : ''
  })
}

// Cleanup all sessions on app quit
export function cleanupTerminals(): void {
  for (const [sessionId, session] of sessions) {
    try {
      session.pty.kill()
    } catch (error) {
      console.error(`Failed to cleanup terminal ${sessionId}:`, error)
    }
  }
  sessions.clear()
}
