# Plano de Migração: Next.js Web para Electron Desktop

## Visão Geral

Este documento detalha o plano de migração do projeto DevFlow de uma aplicação Next.js web para uma aplicação desktop usando Electron.

## Arquitetura Proposta

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Application                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Renderer Process (React)                │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌──────────────┐   │    │
│  │  │   Editor    │ │  Explorer   │ │   Terminal   │   │    │
│  │  │  (Monaco)   │ │  (FileTree) │ │   (xterm)    │   │    │
│  │  └─────────────┘ └─────────────┘ └──────────────┘   │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌──────────────┐   │    │
│  │  │    Git      │ │   Specs     │ │  Autopilot   │   │    │
│  │  │   Panel     │ │   Viewer    │ │    Panel     │   │    │
│  │  └─────────────┘ └─────────────┘ └──────────────┘   │    │
│  └──────────────────────────┬──────────────────────────┘    │
│                             │                                │
│                         IPC Bridge                           │
│                             │                                │
│  ┌──────────────────────────▼──────────────────────────┐    │
│  │               Main Process (Node.js)                 │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌──────────────┐   │    │
│  │  │  PTY        │ │    File     │ │     Git      │   │    │
│  │  │  Manager    │ │   System    │ │  Operations  │   │    │
│  │  └─────────────┘ └─────────────┘ └──────────────┘   │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌──────────────┐   │    │
│  │  │   Window    │ │   Specs     │ │   Search     │   │    │
│  │  │  Manager    │ │   Parser    │ │   Service    │   │    │
│  │  └─────────────┘ └─────────────┘ └──────────────┘   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Estrutura de Diretórios Proposta

```
desktop/
├── package.json
├── electron-builder.yml          # Configuração de build
├── tsconfig.json
├── tsconfig.node.json           # Config para main process
│
├── src/
│   ├── main/                    # Main Process (Node.js)
│   │   ├── index.ts            # Entry point
│   │   ├── window.ts           # Window management
│   │   ├── menu.ts             # Application menu
│   │   ├── ipc/                # IPC handlers
│   │   │   ├── index.ts
│   │   │   ├── files.ts        # File operations
│   │   │   ├── terminal.ts     # PTY management
│   │   │   ├── git.ts          # Git operations
│   │   │   ├── search.ts       # Code search
│   │   │   ├── specs.ts        # Specs parsing
│   │   │   └── autopilot.ts    # Agent execution
│   │   └── services/
│   │       ├── ptyManager.ts   # PTY session manager
│   │       ├── gitService.ts   # Git wrapper
│   │       └── fileService.ts  # File operations
│   │
│   ├── renderer/               # Renderer Process (React)
│   │   ├── index.html
│   │   ├── main.tsx           # React entry point
│   │   ├── App.tsx
│   │   ├── components/        # Copiar de web/components
│   │   ├── hooks/             # Copiar de web/hooks
│   │   ├── lib/               # Copiar de web/lib
│   │   │   ├── stores/
│   │   │   ├── types/
│   │   │   └── utils.ts
│   │   └── api/               # NOVO: IPC client wrapper
│   │       ├── index.ts
│   │       ├── files.ts
│   │       ├── terminal.ts
│   │       ├── git.ts
│   │       └── specs.ts
│   │
│   ├── preload/               # Preload scripts (bridge)
│   │   └── index.ts
│   │
│   └── shared/                # Tipos compartilhados
│       └── types.ts
│
├── resources/                 # Assets para build
│   ├── icon.icns             # macOS
│   ├── icon.ico              # Windows
│   └── icon.png              # Linux
│
└── scripts/
    ├── dev.ts                # Script de desenvolvimento
    └── build.ts              # Script de build
```

---

## Fases de Implementação

### Fase 1: Setup do Projeto Electron

**Objetivo:** Criar estrutura base do projeto Electron com Vite + React

#### 1.1 Inicializar Projeto

```bash
mkdir desktop
cd desktop
npm init -y
```

#### 1.2 Instalar Dependências Core

```bash
# Electron e build tools
npm install --save-dev electron electron-builder
npm install --save-dev vite @vitejs/plugin-react
npm install --save-dev typescript @types/node

# React (mesma versão do web)
npm install react@18.3.1 react-dom@18.3.1
npm install --save-dev @types/react @types/react-dom

# Electron utilities
npm install electron-store          # Persistência
npm install electron-updater        # Auto-updates (opcional)
```

#### 1.3 Configurar TypeScript

**tsconfig.json** (renderer):
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/renderer/*"],
      "@shared/*": ["./src/shared/*"]
    }
  },
  "include": ["src/renderer"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**tsconfig.node.json** (main process):
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist/main",
    "rootDir": "src/main",
    "paths": {
      "@shared/*": ["./src/shared/*"]
    }
  },
  "include": ["src/main", "src/preload", "src/shared"]
}
```

#### 1.4 Configurar Vite

**vite.config.ts**:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  root: 'src/renderer',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  server: {
    port: 5173,
  },
})
```

#### 1.5 Criar Entry Points Básicos

**src/main/index.ts**:
```typescript
import { app, BrowserWindow } from 'electron'
import path from 'path'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset', // macOS
    trafficLightPosition: { x: 15, y: 10 },
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
```

**src/preload/index.ts**:
```typescript
import { contextBridge, ipcRenderer } from 'electron'

// Expor API segura para o renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Files
  readFile: (filePath: string) => ipcRenderer.invoke('files:read', filePath),
  writeFile: (filePath: string, content: string) =>
    ipcRenderer.invoke('files:write', filePath, content),
  createFile: (filePath: string, isDirectory: boolean) =>
    ipcRenderer.invoke('files:create', filePath, isDirectory),
  deleteFile: (filePath: string) => ipcRenderer.invoke('files:delete', filePath),
  renameFile: (oldPath: string, newPath: string) =>
    ipcRenderer.invoke('files:rename', oldPath, newPath),
  getFileTree: (rootPath: string) => ipcRenderer.invoke('files:tree', rootPath),

  // Terminal
  createTerminal: (sessionId: string, cwd: string) =>
    ipcRenderer.invoke('terminal:create', sessionId, cwd),
  writeTerminal: (sessionId: string, data: string) =>
    ipcRenderer.invoke('terminal:write', sessionId, data),
  resizeTerminal: (sessionId: string, cols: number, rows: number) =>
    ipcRenderer.invoke('terminal:resize', sessionId, cols, rows),
  destroyTerminal: (sessionId: string) =>
    ipcRenderer.invoke('terminal:destroy', sessionId),
  onTerminalData: (callback: (sessionId: string, data: string) => void) => {
    ipcRenderer.on('terminal:data', (_, sessionId, data) => callback(sessionId, data))
    return () => ipcRenderer.removeAllListeners('terminal:data')
  },

  // Git
  gitStatus: (repoPath: string) => ipcRenderer.invoke('git:status', repoPath),
  gitStage: (repoPath: string, files: string[]) =>
    ipcRenderer.invoke('git:stage', repoPath, files),
  gitUnstage: (repoPath: string, files: string[]) =>
    ipcRenderer.invoke('git:unstage', repoPath, files),
  gitCommit: (repoPath: string, message: string) =>
    ipcRenderer.invoke('git:commit', repoPath, message),
  gitLog: (repoPath: string, limit: number) =>
    ipcRenderer.invoke('git:log', repoPath, limit),
  gitDiff: (repoPath: string, file?: string) =>
    ipcRenderer.invoke('git:diff', repoPath, file),
  gitBranches: (repoPath: string) => ipcRenderer.invoke('git:branches', repoPath),
  gitCheckout: (repoPath: string, branch: string) =>
    ipcRenderer.invoke('git:checkout', repoPath, branch),

  // Specs
  parseSpecs: (specsPath: string) => ipcRenderer.invoke('specs:parse', specsPath),

  // Search
  searchCode: (rootPath: string, query: string, options?: object) =>
    ipcRenderer.invoke('search:code', rootPath, query, options),

  // Autopilot
  executeAgent: (agent: string, prompt: string, cwd: string) =>
    ipcRenderer.invoke('autopilot:execute', agent, prompt, cwd),

  // Project
  selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  getRecentProjects: () => ipcRenderer.invoke('project:getRecent'),
  addRecentProject: (path: string) => ipcRenderer.invoke('project:addRecent', path),

  // App
  platform: process.platform,
  getVersion: () => ipcRenderer.invoke('app:version'),
})
```

**src/renderer/index.html**:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'">
    <title>DevFlow</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

#### 1.6 Scripts package.json

```json
{
  "name": "devflow-desktop",
  "version": "1.0.0",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "concurrently \"npm run dev:vite\" \"npm run dev:electron\"",
    "dev:vite": "vite",
    "dev:electron": "tsc -p tsconfig.node.json && electron .",
    "build": "npm run build:vite && npm run build:electron",
    "build:vite": "vite build",
    "build:electron": "tsc -p tsconfig.node.json",
    "package": "npm run build && electron-builder",
    "package:mac": "npm run build && electron-builder --mac",
    "package:win": "npm run build && electron-builder --win",
    "package:linux": "npm run build && electron-builder --linux"
  }
}
```

---

### Fase 2: Migrar Componentes React

**Objetivo:** Copiar e adaptar componentes do web para Electron

#### 2.1 Copiar Estrutura Base

```bash
# Copiar componentes
cp -r web/components desktop/src/renderer/components

# Copiar hooks
cp -r web/hooks desktop/src/renderer/hooks

# Copiar lib (stores, types, utils)
cp -r web/lib desktop/src/renderer/lib

# Copiar estilos
cp web/app/globals.css desktop/src/renderer/styles/globals.css
```

#### 2.2 Instalar Dependências do Renderer

```bash
# UI Components
npm install @radix-ui/react-accordion @radix-ui/react-checkbox
npm install @radix-ui/react-collapsible @radix-ui/react-context-menu
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install @radix-ui/react-scroll-area @radix-ui/react-select
npm install @radix-ui/react-slot @radix-ui/react-tabs
npm install @radix-ui/react-tooltip

# Editor e Terminal
npm install @monaco-editor/react monaco-editor
npm install @xterm/xterm @xterm/addon-fit @xterm/addon-web-links
npm install @xterm/addon-webgl

# Markdown e Diagramas
npm install react-markdown remark-gfm rehype-highlight
npm install mermaid

# Styling
npm install tailwindcss postcss autoprefixer
npm install class-variance-authority clsx tailwind-merge
npm install lucide-react

# State Management
npm install zustand
```

#### 2.3 Criar Wrapper de API (IPC Client)

**src/renderer/api/index.ts**:
```typescript
// Type definitions para window.electronAPI
declare global {
  interface Window {
    electronAPI: {
      // Files
      readFile: (path: string) => Promise<string>
      writeFile: (path: string, content: string) => Promise<void>
      createFile: (path: string, isDirectory: boolean) => Promise<void>
      deleteFile: (path: string) => Promise<void>
      renameFile: (oldPath: string, newPath: string) => Promise<void>
      getFileTree: (rootPath: string) => Promise<FileTreeNode[]>

      // Terminal
      createTerminal: (sessionId: string, cwd: string) => Promise<void>
      writeTerminal: (sessionId: string, data: string) => Promise<void>
      resizeTerminal: (sessionId: string, cols: number, rows: number) => Promise<void>
      destroyTerminal: (sessionId: string) => Promise<void>
      onTerminalData: (callback: (sessionId: string, data: string) => void) => () => void

      // Git
      gitStatus: (repoPath: string) => Promise<GitStatus>
      gitStage: (repoPath: string, files: string[]) => Promise<void>
      gitUnstage: (repoPath: string, files: string[]) => Promise<void>
      gitCommit: (repoPath: string, message: string) => Promise<void>
      gitLog: (repoPath: string, limit: number) => Promise<GitCommit[]>
      gitDiff: (repoPath: string, file?: string) => Promise<string>
      gitBranches: (repoPath: string) => Promise<GitBranch[]>
      gitCheckout: (repoPath: string, branch: string) => Promise<void>

      // Specs
      parseSpecs: (specsPath: string) => Promise<Spec[]>

      // Search
      searchCode: (rootPath: string, query: string, options?: SearchOptions) => Promise<SearchResult[]>

      // Autopilot
      executeAgent: (agent: string, prompt: string, cwd: string) => Promise<string>

      // Project
      selectDirectory: () => Promise<string | null>
      getRecentProjects: () => Promise<string[]>
      addRecentProject: (path: string) => Promise<void>

      // App
      platform: NodeJS.Platform
      getVersion: () => Promise<string>
    }
  }
}

export const api = window.electronAPI
```

**src/renderer/api/files.ts**:
```typescript
import { api } from './index'

export async function readFile(path: string): Promise<string> {
  return api.readFile(path)
}

export async function writeFile(path: string, content: string): Promise<void> {
  return api.writeFile(path, content)
}

export async function getFileTree(rootPath: string) {
  return api.getFileTree(rootPath)
}

// ... outras funções
```

#### 2.4 Adaptar Componentes para usar IPC

Substituir chamadas `fetch('/api/...')` por chamadas IPC.

**Exemplo - FileExplorer (antes)**:
```typescript
// web/components/explorer/FileExplorer.tsx
const loadFileTree = async () => {
  const response = await fetch(`/api/files/tree?path=${projectPath}`)
  const data = await response.json()
  setFileTree(data.tree)
}
```

**Exemplo - FileExplorer (depois)**:
```typescript
// desktop/src/renderer/components/explorer/FileExplorer.tsx
import { api } from '@/api'

const loadFileTree = async () => {
  const tree = await api.getFileTree(projectPath)
  setFileTree(tree)
}
```

#### 2.5 Lista de Componentes para Adaptar

| Componente | Mudanças Necessárias |
|------------|---------------------|
| `FileExplorer.tsx` | fetch → api.getFileTree, api.createFile, etc |
| `Editor.tsx` | fetch → api.readFile, api.writeFile |
| `Terminal.tsx` | EventSource → api.onTerminalData (IPC) |
| `GitPanel.tsx` | fetch → api.git* |
| `SpecsViewer.tsx` | fetch → api.parseSpecs |
| `QuickOpen.tsx` | fetch → api.getFileTree |
| `GlobalSearch.tsx` | fetch → api.searchCode |
| `AutopilotPanel.tsx` | fetch → api.executeAgent |
| `SettingsPanel.tsx` | localStorage → electron-store |

---

### Fase 3: Implementar IPC Handlers (Main Process)

**Objetivo:** Criar handlers para todas as operações no main process

#### 3.1 Handler de Arquivos

**src/main/ipc/files.ts**:
```typescript
import { ipcMain } from 'electron'
import fs from 'fs/promises'
import path from 'path'

interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileTreeNode[]
}

export function registerFileHandlers() {
  // Ler arquivo
  ipcMain.handle('files:read', async (_, filePath: string) => {
    const content = await fs.readFile(filePath, 'utf-8')
    return content
  })

  // Escrever arquivo
  ipcMain.handle('files:write', async (_, filePath: string, content: string) => {
    await fs.writeFile(filePath, content, 'utf-8')
  })

  // Criar arquivo/diretório
  ipcMain.handle('files:create', async (_, filePath: string, isDirectory: boolean) => {
    if (isDirectory) {
      await fs.mkdir(filePath, { recursive: true })
    } else {
      await fs.writeFile(filePath, '', 'utf-8')
    }
  })

  // Deletar
  ipcMain.handle('files:delete', async (_, filePath: string) => {
    const stat = await fs.stat(filePath)
    if (stat.isDirectory()) {
      await fs.rm(filePath, { recursive: true })
    } else {
      await fs.unlink(filePath)
    }
  })

  // Renomear
  ipcMain.handle('files:rename', async (_, oldPath: string, newPath: string) => {
    await fs.rename(oldPath, newPath)
  })

  // Árvore de arquivos
  ipcMain.handle('files:tree', async (_, rootPath: string) => {
    const ignoredDirs = ['node_modules', '.git', 'dist', 'build', '.next', '__pycache__']

    async function buildTree(dirPath: string): Promise<FileTreeNode[]> {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      const nodes: FileTreeNode[] = []

      for (const entry of entries) {
        if (ignoredDirs.includes(entry.name)) continue
        if (entry.name.startsWith('.')) continue

        const fullPath = path.join(dirPath, entry.name)

        if (entry.isDirectory()) {
          nodes.push({
            name: entry.name,
            path: fullPath,
            type: 'directory',
            children: await buildTree(fullPath),
          })
        } else {
          nodes.push({
            name: entry.name,
            path: fullPath,
            type: 'file',
          })
        }
      }

      return nodes.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
        return a.name.localeCompare(b.name)
      })
    }

    return buildTree(rootPath)
  })
}
```

#### 3.2 Handler de Terminal (PTY)

**src/main/ipc/terminal.ts**:
```typescript
import { ipcMain, BrowserWindow } from 'electron'
import * as pty from 'node-pty'
import os from 'os'

interface TerminalSession {
  pty: pty.IPty
  buffer: string[]
}

const sessions = new Map<string, TerminalSession>()
const MAX_BUFFER_LINES = 1000

export function registerTerminalHandlers(getMainWindow: () => BrowserWindow | null) {
  // Criar sessão
  ipcMain.handle('terminal:create', async (_, sessionId: string, cwd: string) => {
    if (sessions.has(sessionId)) {
      return { success: true, message: 'Session already exists' }
    }

    const shell = os.platform() === 'win32' ? 'powershell.exe' :
                  process.env.SHELL || '/bin/zsh'

    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd,
      env: process.env as { [key: string]: string },
    })

    const session: TerminalSession = {
      pty: ptyProcess,
      buffer: [],
    }

    // Encaminhar dados para o renderer
    ptyProcess.onData((data) => {
      session.buffer.push(data)
      if (session.buffer.length > MAX_BUFFER_LINES) {
        session.buffer.shift()
      }

      const mainWindow = getMainWindow()
      if (mainWindow) {
        mainWindow.webContents.send('terminal:data', sessionId, data)
      }
    })

    ptyProcess.onExit(({ exitCode }) => {
      const mainWindow = getMainWindow()
      if (mainWindow) {
        mainWindow.webContents.send('terminal:exit', sessionId, exitCode)
      }
      sessions.delete(sessionId)
    })

    sessions.set(sessionId, session)
    return { success: true }
  })

  // Escrever no terminal
  ipcMain.handle('terminal:write', async (_, sessionId: string, data: string) => {
    const session = sessions.get(sessionId)
    if (session) {
      session.pty.write(data)
    }
  })

  // Redimensionar
  ipcMain.handle('terminal:resize', async (_, sessionId: string, cols: number, rows: number) => {
    const session = sessions.get(sessionId)
    if (session) {
      session.pty.resize(cols, rows)
    }
  })

  // Destruir sessão
  ipcMain.handle('terminal:destroy', async (_, sessionId: string) => {
    const session = sessions.get(sessionId)
    if (session) {
      session.pty.kill()
      sessions.delete(sessionId)
    }
  })

  // Obter buffer (para reconexão)
  ipcMain.handle('terminal:getBuffer', async (_, sessionId: string) => {
    const session = sessions.get(sessionId)
    return session ? session.buffer.join('') : ''
  })
}
```

#### 3.3 Handler de Git

**src/main/ipc/git.ts**:
```typescript
import { ipcMain } from 'electron'
import simpleGit, { SimpleGit } from 'simple-git'

function getGit(repoPath: string): SimpleGit {
  return simpleGit(repoPath)
}

export function registerGitHandlers() {
  ipcMain.handle('git:status', async (_, repoPath: string) => {
    const git = getGit(repoPath)
    const status = await git.status()
    return {
      current: status.current,
      tracking: status.tracking,
      ahead: status.ahead,
      behind: status.behind,
      staged: status.staged,
      modified: status.modified,
      not_added: status.not_added,
      deleted: status.deleted,
      conflicted: status.conflicted,
      isClean: status.isClean(),
    }
  })

  ipcMain.handle('git:stage', async (_, repoPath: string, files: string[]) => {
    const git = getGit(repoPath)
    await git.add(files)
  })

  ipcMain.handle('git:unstage', async (_, repoPath: string, files: string[]) => {
    const git = getGit(repoPath)
    await git.reset(['HEAD', '--', ...files])
  })

  ipcMain.handle('git:commit', async (_, repoPath: string, message: string) => {
    const git = getGit(repoPath)
    await git.commit(message)
  })

  ipcMain.handle('git:log', async (_, repoPath: string, limit: number = 50) => {
    const git = getGit(repoPath)
    const log = await git.log({ maxCount: limit })
    return log.all.map(commit => ({
      hash: commit.hash,
      date: commit.date,
      message: commit.message,
      author_name: commit.author_name,
      author_email: commit.author_email,
    }))
  })

  ipcMain.handle('git:diff', async (_, repoPath: string, file?: string) => {
    const git = getGit(repoPath)
    if (file) {
      return git.diff(['--', file])
    }
    return git.diff()
  })

  ipcMain.handle('git:branches', async (_, repoPath: string) => {
    const git = getGit(repoPath)
    const branches = await git.branch()
    return {
      current: branches.current,
      all: branches.all,
      branches: Object.entries(branches.branches).map(([name, info]) => ({
        name,
        current: info.current,
        commit: info.commit,
      })),
    }
  })

  ipcMain.handle('git:checkout', async (_, repoPath: string, branch: string) => {
    const git = getGit(repoPath)
    await git.checkout(branch)
  })

  ipcMain.handle('git:createBranch', async (_, repoPath: string, branch: string) => {
    const git = getGit(repoPath)
    await git.checkoutLocalBranch(branch)
  })
}
```

#### 3.4 Handler de Search

**src/main/ipc/search.ts**:
```typescript
import { ipcMain } from 'electron'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface SearchResult {
  file: string
  line: number
  content: string
  match: string
}

export function registerSearchHandlers() {
  ipcMain.handle('search:code', async (_, rootPath: string, query: string, options?: {
    fileTypes?: string[]
    caseSensitive?: boolean
    maxResults?: number
  }) => {
    const { fileTypes = [], caseSensitive = false, maxResults = 100 } = options || {}

    // Usar ripgrep se disponível, senão grep
    const rgArgs = [
      '--json',
      caseSensitive ? '' : '-i',
      `-m ${maxResults}`,
      ...fileTypes.map(t => `-g "*.${t}"`),
      `"${query}"`,
      rootPath,
    ].filter(Boolean).join(' ')

    try {
      const { stdout } = await execAsync(`rg ${rgArgs}`)
      const results: SearchResult[] = []

      stdout.split('\n').forEach(line => {
        if (!line) return
        try {
          const parsed = JSON.parse(line)
          if (parsed.type === 'match') {
            results.push({
              file: parsed.data.path.text,
              line: parsed.data.line_number,
              content: parsed.data.lines.text,
              match: parsed.data.submatches[0]?.match?.text || '',
            })
          }
        } catch {}
      })

      return results
    } catch (error) {
      // Fallback para grep básico
      return []
    }
  })
}
```

#### 3.5 Handler de Specs

**src/main/ipc/specs.ts**:
```typescript
import { ipcMain } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'

interface Spec {
  id: string
  title: string
  status: string
  priority: string
  content: string
  tasks: { text: string; completed: boolean }[]
  metadata: Record<string, any>
}

export function registerSpecsHandlers() {
  ipcMain.handle('specs:parse', async (_, specsPath: string) => {
    const specs: Spec[] = []

    try {
      const files = await fs.readdir(specsPath)
      const mdFiles = files.filter(f => f.endsWith('.md'))

      for (const file of mdFiles) {
        const filePath = path.join(specsPath, file)
        const content = await fs.readFile(filePath, 'utf-8')
        const { data, content: body } = matter(content)

        // Extrair tasks (checkboxes)
        const taskRegex = /- \[([ x])\] (.+)/g
        const tasks: { text: string; completed: boolean }[] = []
        let match
        while ((match = taskRegex.exec(body)) !== null) {
          tasks.push({
            completed: match[1] === 'x',
            text: match[2],
          })
        }

        specs.push({
          id: file.replace('.md', ''),
          title: data.title || file.replace('.md', ''),
          status: data.status || 'draft',
          priority: data.priority || 'medium',
          content: body,
          tasks,
          metadata: data,
        })
      }
    } catch (error) {
      console.error('Error parsing specs:', error)
    }

    return specs
  })
}
```

#### 3.6 Handler de Autopilot

**src/main/ipc/autopilot.ts**:
```typescript
import { ipcMain } from 'electron'
import { spawn } from 'child_process'

export function registerAutopilotHandlers() {
  ipcMain.handle('autopilot:execute', async (_, agent: string, prompt: string, cwd: string) => {
    return new Promise((resolve, reject) => {
      // Mapear agentes para skills do Claude Code
      const skillMap: Record<string, string> = {
        strategist: '/agents:strategist',
        architect: '/agents:architect',
        builder: '/agents:builder',
        guardian: '/agents:guardian',
        chronicler: '/agents:chronicler',
      }

      const skill = skillMap[agent]
      if (!skill) {
        reject(new Error(`Unknown agent: ${agent}`))
        return
      }

      // Executar claude com o skill
      const proc = spawn('claude', ['-p', `${skill} ${prompt}`], {
        cwd,
        shell: true,
      })

      let output = ''
      let error = ''

      proc.stdout.on('data', (data) => {
        output += data.toString()
      })

      proc.stderr.on('data', (data) => {
        error += data.toString()
      })

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(output)
        } else {
          reject(new Error(error || `Process exited with code ${code}`))
        }
      })
    })
  })
}
```

#### 3.7 Registrar Todos os Handlers

**src/main/ipc/index.ts**:
```typescript
import { BrowserWindow } from 'electron'
import { registerFileHandlers } from './files'
import { registerTerminalHandlers } from './terminal'
import { registerGitHandlers } from './git'
import { registerSearchHandlers } from './search'
import { registerSpecsHandlers } from './specs'
import { registerAutopilotHandlers } from './autopilot'

export function registerAllHandlers(getMainWindow: () => BrowserWindow | null) {
  registerFileHandlers()
  registerTerminalHandlers(getMainWindow)
  registerGitHandlers()
  registerSearchHandlers()
  registerSpecsHandlers()
  registerAutopilotHandlers()
}
```

---

### Fase 4: Adaptar Terminal Component

**Objetivo:** Modificar o componente de terminal para usar IPC ao invés de SSE

#### 4.1 Terminal Component Adaptado

**src/renderer/components/terminal/Terminal.tsx**:
```typescript
import { useEffect, useRef, useCallback } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { WebglAddon } from '@xterm/addon-webgl'
import { api } from '@/api'
import '@xterm/xterm/css/xterm.css'

interface TerminalProps {
  sessionId: string
  cwd: string
  onReady?: () => void
}

export function Terminal({ sessionId, cwd, onReady }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Criar instância do xterm
    const terminal = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        selectionBackground: '#264f78',
      },
    })

    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.loadAddon(new WebLinksAddon())

    try {
      terminal.loadAddon(new WebglAddon())
    } catch {
      console.warn('WebGL addon not supported')
    }

    terminal.open(containerRef.current)
    fitAddon.fit()

    terminalRef.current = terminal
    fitAddonRef.current = fitAddon

    // Criar sessão PTY
    api.createTerminal(sessionId, cwd).then(() => {
      onReady?.()
    })

    // Receber dados do PTY via IPC
    const unsubscribe = api.onTerminalData((sid, data) => {
      if (sid === sessionId) {
        terminal.write(data)
      }
    })

    // Enviar input para o PTY
    terminal.onData((data) => {
      api.writeTerminal(sessionId, data)
    })

    // Resize handler
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit()
      const { cols, rows } = terminal
      api.resizeTerminal(sessionId, cols, rows)
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      unsubscribe()
      resizeObserver.disconnect()
      api.destroyTerminal(sessionId)
      terminal.dispose()
    }
  }, [sessionId, cwd, onReady])

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-[#1e1e1e]"
    />
  )
}
```

---

### Fase 5: Configurar Build e Distribuição

**Objetivo:** Configurar electron-builder para gerar instaladores

#### 5.1 Configuração electron-builder

**electron-builder.yml**:
```yaml
appId: com.devflow.app
productName: DevFlow
copyright: Copyright © 2024

directories:
  output: release
  buildResources: resources

files:
  - dist/**/*
  - package.json

extraResources:
  - from: resources/
    to: resources/

mac:
  category: public.app-category.developer-tools
  icon: resources/icon.icns
  target:
    - target: dmg
      arch:
        - x64
        - arm64
    - target: zip
      arch:
        - x64
        - arm64
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist

win:
  icon: resources/icon.ico
  target:
    - target: nsis
      arch:
        - x64
    - target: portable
      arch:
        - x64

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true

linux:
  icon: resources/icon.png
  category: Development
  target:
    - target: AppImage
      arch:
        - x64
    - target: deb
      arch:
        - x64

publish:
  provider: github
  owner: your-username
  repo: devflow
```

#### 5.2 Entitlements (macOS)

**build/entitlements.mac.plist**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.disable-library-validation</key>
  <true/>
  <key>com.apple.security.automation.apple-events</key>
  <true/>
</dict>
</plist>
```

---

### Fase 6: Testes e Polish

**Objetivo:** Garantir que tudo funciona corretamente

#### 6.1 Checklist de Testes

- [ ] **File Explorer**
  - [ ] Navegar em diretórios
  - [ ] Abrir arquivos
  - [ ] Criar arquivos/pastas
  - [ ] Renomear
  - [ ] Deletar

- [ ] **Editor**
  - [ ] Abrir múltiplos arquivos
  - [ ] Editar e salvar
  - [ ] Syntax highlighting
  - [ ] Markdown preview
  - [ ] Mermaid diagrams

- [ ] **Terminal**
  - [ ] Abrir terminal
  - [ ] Executar comandos
  - [ ] Múltiplas sessões
  - [ ] Resize
  - [ ] Copy/paste

- [ ] **Git**
  - [ ] Ver status
  - [ ] Stage/unstage
  - [ ] Commit
  - [ ] Ver diff
  - [ ] Trocar branch

- [ ] **Specs**
  - [ ] Carregar specs
  - [ ] Visualizar markdown
  - [ ] Task checkboxes

- [ ] **Search**
  - [ ] Quick open (Cmd+K)
  - [ ] Global search (Cmd+Shift+F)
  - [ ] Resultados clicáveis

- [ ] **Autopilot**
  - [ ] Executar agentes
  - [ ] Ver output

#### 6.2 Performance

- [ ] Startup time < 3s
- [ ] Memory usage < 500MB idle
- [ ] Smooth scrolling no editor
- [ ] Terminal lag < 50ms

#### 6.3 Platform-specific

- [ ] **macOS**
  - [ ] Menu bar funciona
  - [ ] Traffic lights corretos
  - [ ] Cmd+Q fecha app
  - [ ] Dark mode

- [ ] **Windows**
  - [ ] Instalador funciona
  - [ ] Atalhos corretos
  - [ ] Paths com backslash

- [ ] **Linux**
  - [ ] AppImage executa
  - [ ] Permissões de arquivo

---

## Dependências Finais do Desktop

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zustand": "^5.0.2",
    "@monaco-editor/react": "^4.6.0",
    "@xterm/xterm": "^5.5.0",
    "@xterm/addon-fit": "^0.10.0",
    "@xterm/addon-web-links": "^0.11.0",
    "@xterm/addon-webgl": "^0.18.0",
    "node-pty": "^1.0.0",
    "simple-git": "^3.30.0",
    "gray-matter": "^4.0.3",
    "electron-store": "^8.1.0",
    "mermaid": "^11.4.0",
    "react-markdown": "^9.0.1",
    "remark-gfm": "^4.0.0",
    "rehype-highlight": "^7.0.1",
    "@radix-ui/react-accordion": "^1.2.0",
    "@radix-ui/react-checkbox": "^1.1.0",
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-dropdown-menu": "^2.1.0",
    "@radix-ui/react-scroll-area": "^1.2.0",
    "@radix-ui/react-tabs": "^1.1.0",
    "@radix-ui/react-tooltip": "^1.1.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "lucide-react": "^0.400.0"
  },
  "devDependencies": {
    "electron": "^31.0.0",
    "electron-builder": "^24.13.0",
    "vite": "^5.4.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.5.0",
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "concurrently": "^8.2.0"
  }
}
```

---

## Resumo de Esforço

| Fase | Descrição | Estimativa |
|------|-----------|------------|
| 1 | Setup Electron + Vite | 2-3 dias |
| 2 | Migrar componentes React | 3-5 dias |
| 3 | Implementar IPC handlers | 5-7 dias |
| 4 | Adaptar Terminal | 2-3 dias |
| 5 | Build e distribuição | 2-3 dias |
| 6 | Testes e polish | 3-5 dias |
| **Total** | | **17-26 dias** |

---

## Notas Importantes

1. **node-pty**: Requer rebuild para cada versão do Electron. Use `electron-rebuild`.

2. **Monaco Editor**: Pode precisar de configuração extra de workers. Use `monaco-editor-webpack-plugin` ou equivalente Vite.

3. **Segurança**: Manter `contextIsolation: true` e `nodeIntegration: false`. Usar preload scripts.

4. **Auto-updates**: Configurar `electron-updater` para atualizações automáticas via GitHub Releases.

5. **Code signing**: Para distribuição, será necessário certificado de desenvolvedor (Apple, Microsoft).
