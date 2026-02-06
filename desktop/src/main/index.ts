// Handle EPIPE errors on stdout/stderr to prevent crashes when pipes are broken
// This must run before any console.log/warn/error calls
for (const stream of [process.stdout, process.stderr]) {
  stream?.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EPIPE') return
    throw err
  })
}

import { app, BrowserWindow, shell, nativeTheme } from 'electron'
import path from 'path'
import { registerAllHandlers } from './ipc'
import { createMenu } from './menu'

let mainWindow: BrowserWindow | null = null

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1e1e1e' : '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Required for node-pty
      webSecurity: true,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 15, y: 15 },
    frame: process.platform !== 'darwin',
  })

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    if (isDev) {
      mainWindow?.webContents.openDevTools()
    }
  })

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Get main window reference for IPC handlers
export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

// App lifecycle
app.whenReady().then(async () => {
  // Install React DevTools in development
  if (isDev) {
    try {
      const { default: installExtension, REACT_DEVELOPER_TOOLS } = await import('electron-devtools-installer')
      await installExtension(REACT_DEVELOPER_TOOLS)
      console.log('React DevTools installed successfully')
    } catch (err) {
      console.error('Failed to install React DevTools:', err)
    }
  }

  // Register IPC handlers
  registerAllHandlers(getMainWindow)

  // Create menu
  createMenu()

  // Create window
  createWindow()

  // macOS: Re-create window when dock icon clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Security: Prevent new window creation
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, url) => {
    // Only allow navigation in dev mode to localhost
    if (!isDev || !url.startsWith('http://localhost')) {
      event.preventDefault()
    }
  })
})

// Handle certificate errors in development
if (isDev) {
  app.on('certificate-error', (event, _webContents, _url, _error, _certificate, callback) => {
    event.preventDefault()
    callback(true)
  })
}
