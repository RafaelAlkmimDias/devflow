import { BrowserWindow, screen, Rectangle } from 'electron'
import Store from 'electron-store'

interface WindowState {
  x?: number
  y?: number
  width: number
  height: number
  isMaximized: boolean
}

const store = new Store<{ windowState: WindowState }>({
  name: 'window-state',
  defaults: {
    windowState: {
      width: 1400,
      height: 900,
      isMaximized: false,
    },
  },
})

export function getWindowState(): WindowState {
  const state = store.get('windowState')

  // Validate that window is within screen bounds
  const displays = screen.getAllDisplays()
  const isInBounds = displays.some((display) => {
    const { x, y, width, height } = display.bounds
    return (
      state.x !== undefined &&
      state.y !== undefined &&
      state.x >= x &&
      state.y >= y &&
      state.x + state.width <= x + width &&
      state.y + state.height <= y + height
    )
  })

  if (!isInBounds) {
    // Reset to default position
    return {
      width: state.width,
      height: state.height,
      isMaximized: state.isMaximized,
    }
  }

  return state
}

export function saveWindowState(window: BrowserWindow): void {
  const isMaximized = window.isMaximized()
  const bounds: Rectangle = window.getBounds()

  store.set('windowState', {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    isMaximized,
  })
}

export function trackWindowState(window: BrowserWindow): void {
  const saveState = () => {
    if (!window.isMinimized() && !window.isMaximized()) {
      saveWindowState(window)
    }
  }

  window.on('resize', saveState)
  window.on('move', saveState)
  window.on('close', () => {
    saveWindowState(window)
  })
}
