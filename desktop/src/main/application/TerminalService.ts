import { BrowserWindow } from 'electron'
import * as pty from 'node-pty'
import os from 'os'

interface TerminalSession {
  pty: pty.IPty
  buffer: string[]
}

const MAX_BUFFER_LINES = 1000

/**
 * Service responsible for managing PTY terminal sessions.
 * Handles session lifecycle and data streaming.
 */
export class TerminalService {
  private sessions: Map<string, TerminalSession> = new Map()
  private getMainWindow: () => BrowserWindow | null = () => null

  /**
   * Set the function to get the main window (for IPC)
   */
  setMainWindowGetter(getter: () => BrowserWindow | null): void {
    this.getMainWindow = getter
  }

  /**
   * Create a new terminal session
   */
  async create(
    sessionId: string,
    cwd: string,
    cols?: number,
    rows?: number
  ): Promise<{ success: boolean; message?: string }> {
    if (this.sessions.has(sessionId)) {
      return { success: true, message: 'Session already exists' }
    }

    try {
      const shell = this.getShell()
      const shellArgs = os.platform() === 'win32' ? [] : ['-l']

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

      ptyProcess.onData((data: string) => {
        session.buffer.push(data)
        if (session.buffer.length > MAX_BUFFER_LINES) {
          session.buffer.shift()
        }

        const mainWindow = this.getMainWindow()
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('terminal:data', sessionId, data)
        }
      })

      ptyProcess.onExit(({ exitCode }) => {
        const mainWindow = this.getMainWindow()
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('terminal:exit', sessionId, exitCode)
        }
        this.sessions.delete(sessionId)
      })

      this.sessions.set(sessionId, session)
      return { success: true }
    } catch (error) {
      console.error('Failed to create terminal:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Write data to a terminal session
   */
  async write(sessionId: string, data: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.pty.write(data)
    }
  }

  /**
   * Resize a terminal session
   */
  async resize(sessionId: string, cols: number, rows: number): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (session) {
      try {
        session.pty.resize(cols, rows)
      } catch (error) {
        console.error('Failed to resize terminal:', error)
      }
    }
  }

  /**
   * Destroy a terminal session
   */
  async destroy(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (session) {
      try {
        session.pty.kill()
      } catch (error) {
        console.error('Failed to kill terminal:', error)
      }
      this.sessions.delete(sessionId)
    }
  }

  /**
   * Get the buffer for a terminal session (for reconnection)
   */
  async getBuffer(sessionId: string): Promise<string> {
    const session = this.sessions.get(sessionId)
    return session ? session.buffer.join('') : ''
  }

  /**
   * Get the appropriate shell for the current platform
   */
  private getShell(): string {
    return os.platform() === 'win32'
      ? process.env.COMSPEC || 'powershell.exe'
      : process.env.SHELL || '/bin/zsh'
  }

  /**
   * Cleanup all sessions on app quit
   */
  cleanupAll(): void {
    for (const [sessionId, session] of this.sessions) {
      try {
        session.pty.kill()
      } catch (error) {
        console.error(`Failed to cleanup terminal ${sessionId}:`, error)
      }
    }
    this.sessions.clear()
  }
}

// Singleton instance
export const terminalService = new TerminalService()
