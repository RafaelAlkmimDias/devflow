/**
 * Terminal API operations
 */
export const terminalApi = {
  create: (sessionId: string, cwd: string, cols?: number, rows?: number): Promise<{ success: boolean }> => {
    return window.electronAPI.createTerminal(sessionId, cwd, cols, rows)
  },

  write: (sessionId: string, data: string): Promise<void> => {
    return window.electronAPI.writeTerminal(sessionId, data)
  },

  resize: (sessionId: string, cols: number, rows: number): Promise<void> => {
    return window.electronAPI.resizeTerminal(sessionId, cols, rows)
  },

  destroy: (sessionId: string): Promise<void> => {
    return window.electronAPI.destroyTerminal(sessionId)
  },

  getBuffer: (sessionId: string): Promise<string> => {
    return window.electronAPI.getTerminalBuffer(sessionId)
  },

  onData: (callback: (sessionId: string, data: string) => void): (() => void) => {
    return window.electronAPI.onTerminalData(callback)
  },

  onExit: (callback: (sessionId: string, exitCode: number) => void): (() => void) => {
    return window.electronAPI.onTerminalExit(callback)
  },
}
