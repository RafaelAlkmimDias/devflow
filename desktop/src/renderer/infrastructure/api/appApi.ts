/**
 * App-level API operations (platform info, external links, etc.)
 */
export const appApi = {
  platform: window.electronAPI.platform,

  getVersion: (): Promise<string> => {
    return window.electronAPI.getVersion()
  },

  openExternal: (url: string): Promise<void> => {
    return window.electronAPI.openExternal(url)
  },

  onMenuEvent: (event: string, callback: () => void): (() => void) => {
    return window.electronAPI.onMenuEvent(event, callback)
  },
}
