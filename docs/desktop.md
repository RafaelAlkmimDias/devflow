# DevFlow Desktop - Documentação Técnica

Documentação completa do aplicativo desktop do DevFlow - uma IDE nativa construída com Electron, React e TypeScript.

---

## Visão Geral

O DevFlow Desktop é um aplicativo Electron que oferece uma experiência de IDE completa com:

- **Editor Monaco** (mesmo do VS Code)
- **Terminal integrado** com PTY real via node-pty
- **Integração Git** completa
- **Sistema Autopilot** para execução de agentes Claude
- **Suporte multiplataforma** (macOS, Windows, Linux)

```
┌─────────────────────────────────────────┐
│         Electron Titlebar               │
├─────────┬───────────────────────────────┤
│         │                               │
│ Sidebar │       Editor Monaco           │
│ (280px) │                               │
│         │   Tabs | Preview | Mermaid    │
│ Explorer│                               │
│ Git     ├───────────────────────────────┤
│ Specs   │                               │
│         │       Terminal Panel          │
│         │        (xterm.js)             │
├─────────┴───────────────────────────────┤
│              Status Bar                 │
└─────────────────────────────────────────┘
```

---

## Estrutura de Diretórios

```
desktop/
├── src/
│   ├── main/                    # Processo principal (Node.js)
│   │   ├── index.ts            # Lifecycle & window management
│   │   ├── menu.ts             # Menus da aplicação
│   │   ├── window.ts           # Gerenciamento de janela
│   │   └── ipc/                # IPC handlers
│   │       ├── index.ts        # Registro IPC & projetos
│   │       ├── files.ts        # Operações de arquivo
│   │       ├── terminal.ts     # Terminal/PTY
│   │       ├── git.ts          # Operações Git
│   │       ├── search.ts       # Busca de código
│   │       ├── specs.ts        # Parser de specs
│   │       └── autopilot.ts    # Execução de agentes
│   │
│   ├── preload/                 # Script de preload (ponte segura)
│   │   └── index.ts            # API exposta via contextBridge
│   │
│   ├── renderer/                # Frontend React
│   │   ├── App.tsx             # Componente principal
│   │   ├── main.tsx            # Entry point React
│   │   ├── api/                # Wrapper IPC
│   │   ├── components/         # Componentes React (25+)
│   │   │   ├── layout/         # Shell, Sidebar, StatusBar
│   │   │   ├── editor/         # Monaco, Tabs, Preview
│   │   │   ├── explorer/       # FileTree, FileExplorer
│   │   │   ├── terminal/       # TerminalPanel
│   │   │   ├── git/            # GitPanel
│   │   │   ├── modals/         # QuickOpen, GlobalSearch
│   │   │   ├── settings/       # SettingsPanel
│   │   │   ├── agents/         # AgentIcons
│   │   │   ├── autopilot/      # Autopilot UI
│   │   │   ├── specs/          # Specs UI
│   │   │   └── ui/             # Componentes UI genéricos
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/
│   │   │   ├── stores/         # Zustand stores
│   │   │   ├── types/          # Definições de tipos
│   │   │   ├── constants/      # Constantes (agentes)
│   │   │   └── utils.ts        # Funções utilitárias
│   │   └── styles/             # Arquivos CSS
│   │
│   └── shared/                  # Tipos compartilhados
│       └── types.ts            # Tipos & IPC_CHANNELS
│
├── build/                       # Assets de build
│   └── entitlements.mac.plist  # Entitlements macOS
│
├── resources/                   # Ícones e recursos
├── dist/                        # Output de build
│
├── vite.config.ts              # Configuração Vite
├── tsconfig.json               # TypeScript (renderer)
├── tsconfig.node.json          # TypeScript (main)
├── tailwind.config.ts          # Tailwind CSS
├── electron-builder.yml        # Packaging config
└── package.json                # Dependências & scripts
```

---

## Tech Stack

| Categoria | Tecnologia | Versão |
|-----------|------------|--------|
| **Framework** | Electron | 33.2.0 |
| **UI** | React | 18.3.1 |
| **Linguagem** | TypeScript | 5.7.2 |
| **Build Tool** | Vite | 6.0.5 |
| **Editor** | Monaco Editor | 0.55.1 |
| **Terminal** | xterm.js | 5.5.0 |
| **PTY** | node-pty | 1.0.0 |
| **Styling** | Tailwind CSS | 3.4.17 |
| **State** | Zustand | 5.0.2 |
| **Storage** | electron-store | 8.2.0 |
| **Git** | simple-git | 3.27.0 |
| **UI Components** | Radix UI | 1.x |
| **Icons** | Lucide React | 0.468.0 |
| **Markdown** | react-markdown | 9.0.1 |
| **Diagramas** | Mermaid | 11.4.0 |
| **Toasts** | Sonner | 1.7.1 |
| **Packaging** | electron-builder | 25.1.8 |

---

## Arquitetura Electron

### Processos

O Electron opera com três processos isolados:

```
┌─────────────────────────────────────────────────────────────┐
│                     MAIN PROCESS                            │
│  (Node.js - acesso total ao sistema)                        │
│  - Gerenciamento de janelas                                 │
│  - IPC handlers                                             │
│  - File system, Git, Terminal                               │
└──────────────────────────┬──────────────────────────────────┘
                           │ IPC (contextBridge)
┌──────────────────────────┴──────────────────────────────────┐
│                    PRELOAD SCRIPT                           │
│  (Ponte segura entre main e renderer)                       │
│  - Expõe APIs seguras via contextBridge                     │
└──────────────────────────┬──────────────────────────────────┘
                           │ window.electronAPI
┌──────────────────────────┴──────────────────────────────────┐
│                   RENDERER PROCESS                          │
│  (Chromium - sem acesso ao Node.js)                         │
│  - React UI                                                 │
│  - Zustand stores                                           │
└─────────────────────────────────────────────────────────────┘
```

### Configurações de Segurança

```typescript
// src/main/index.ts
webPreferences: {
  contextIsolation: true,    // Isolamento de contexto
  nodeIntegration: false,    // Node desabilitado no renderer
  sandbox: false,            // Necessário para node-pty
  preload: preloadPath,      // Script de ponte
}
```

---

## IPC (Inter-Process Communication)

### Arquitetura

Comunicação via `ipcMain.handle()` (request-response):

```typescript
// Main process (handler)
ipcMain.handle('files:read', async (event, filePath) => {
  return await fs.readFile(filePath, 'utf-8')
})

// Preload (ponte)
contextBridge.exposeInMainWorld('electronAPI', {
  readFile: (path: string) => ipcRenderer.invoke('files:read', path)
})

// Renderer (uso)
const content = await window.electronAPI.readFile('/path/to/file')
```

### Módulos IPC

#### Files (`/src/main/ipc/files.ts`)

| Canal | Descrição |
|-------|-----------|
| `files:read` | Lê conteúdo do arquivo |
| `files:write` | Escreve conteúdo no arquivo |
| `files:create` | Cria arquivo ou diretório |
| `files:delete` | Remove arquivo ou diretório |
| `files:rename` | Renomeia arquivo ou diretório |
| `files:tree` | Retorna árvore de arquivos |
| `files:stats` | Retorna metadados do arquivo |

#### Terminal (`/src/main/ipc/terminal.ts`)

| Canal | Descrição |
|-------|-----------|
| `terminal:create` | Cria sessão PTY |
| `terminal:write` | Envia input para terminal |
| `terminal:resize` | Redimensiona terminal |
| `terminal:destroy` | Encerra sessão |
| `terminal:getBuffer` | Obtém buffer de saída |
| `terminal:data` | (evento) Output do terminal |
| `terminal:exit` | (evento) Processo encerrado |

#### Git (`/src/main/ipc/git.ts`)

| Canal | Descrição |
|-------|-----------|
| `git:status` | Status do repositório |
| `git:stage` | Stage arquivos |
| `git:unstage` | Unstage arquivos |
| `git:commit` | Cria commit |
| `git:log` | Histórico de commits |
| `git:diff` | Diff de arquivos |
| `git:branches` | Lista branches |
| `git:checkout` | Troca de branch |
| `git:createBranch` | Cria nova branch |
| `git:pull` / `git:push` | Sync com remote |
| `git:discard` | Descarta mudanças |
| `git:init` | Inicializa repositório |
| `git:isRepo` | Verifica se é repo Git |

#### Search (`/src/main/ipc/search.ts`)

| Canal | Descrição |
|-------|-----------|
| `search:code` | Busca em conteúdo (regex) |
| `search:files` | Busca por nome de arquivo |

#### Specs (`/src/main/ipc/specs.ts`)

| Canal | Descrição |
|-------|-----------|
| `specs:parse` | Parse de markdown com frontmatter |

#### Autopilot (`/src/main/ipc/autopilot.ts`)

| Canal | Descrição |
|-------|-----------|
| `autopilot:execute` | Executa agente Claude CLI |

#### Project & Dialog (`/src/main/ipc/index.ts`)

| Canal | Descrição |
|-------|-----------|
| `dialog:selectDirectory` | Seletor de diretório nativo |
| `project:getRecent` | Lista projetos recentes |
| `project:addRecent` | Adiciona aos recentes |
| `project:removeRecent` | Remove dos recentes |
| `app:version` | Versão do aplicativo |
| `app:openExternal` | Abre URL no navegador |

---

## Gerenciamento de Estado (Zustand)

### projectStore

```typescript
interface ProjectState {
  currentProject: ProjectInfo | null
  recentProjects: RecentProject[]
  isLoading: boolean
  error: string | null
}

// Actions
openProject(path: string)
closeProject()
selectProjectDialog()
```

### fileStore

```typescript
interface FileState {
  tree: FileTreeNode | null
  openFiles: OpenFile[]
  activeFile: string | null
  expandedFolders: Set<string>
  pinnedFiles: Set<string>
  tabHistory: string[]
  closedTabs: ClosedTab[]
}

// Actions
loadTree(projectPath: string)
openFile(path: string)
saveFile(path: string)
createFile(parentPath: string, name: string)
deleteFile(path: string)
renameFile(oldPath: string, newName: string)
navigateBack() / navigateForward()
togglePinned(path: string)
reopenClosedTab()
```

### uiStore

```typescript
interface UIState {
  theme: 'dark' | 'light' | 'system'
  sidebarVisible: boolean
  sidebarWidth: number
  activePanel: 'explorer' | 'git' | 'specs'
  terminalVisible: boolean
  terminalHeight: number
  terminalMaximized: boolean
  activeModal: ModalType | null
  selectedModel: string
}
```

### gitStore

```typescript
interface GitState {
  status: GitStatus | null
  commits: GitCommit[]
  branches: GitBranches | null
  selectedFiles: Set<string>
}
```

### specsStore

```typescript
interface SpecsState {
  specs: Spec[]
  selectedSpecId: string | null
}
```

### settingsStore

```typescript
interface SettingsState {
  settingsOpen: boolean
  preferences: UserPreferences
}
```

---

## Componentes React

### Layout

| Componente | Descrição |
|------------|-----------|
| `Shell` | Container flex principal |
| `Sidebar` | Navegação lateral |
| `StatusBar` | Barra de status inferior |

### Editor

| Componente | Descrição |
|------------|-----------|
| `MonacoEditor` | Editor de código |
| `EditorPanel` | Container do editor |
| `EditorTabs` | Barra de tabs |
| `TabContextMenu` | Menu de contexto das tabs |
| `Breadcrumbs` | Navegação de path |
| `MarkdownPreview` | Preview de Markdown |
| `MermaidDiagram` | Renderização de diagramas |

### Explorer

| Componente | Descrição |
|------------|-----------|
| `FileExplorer` | Navegador de arquivos |
| `FileTree` | Árvore de pastas/arquivos |
| `FileContextMenu` | Menu de contexto |

### Terminal

| Componente | Descrição |
|------------|-----------|
| `TerminalPanel` | Terminal xterm.js |

### Git

| Componente | Descrição |
|------------|-----------|
| `GitPanel` | Painel de controle Git |

### Modais

| Componente | Atalho | Descrição |
|------------|--------|-----------|
| `QuickOpen` | `Cmd+P` | Busca de arquivos |
| `GlobalSearch` | `Cmd+Shift+F` | Busca full-text |
| `CommandPalette` | `Cmd+Shift+P` | Paleta de comandos |

### UI

| Componente | Descrição |
|------------|-----------|
| `ResizeHandle` | Handle de redimensionamento |
| `LoadingSpinner` | Indicador de carregamento |
| `Skeleton` | Placeholder skeleton |
| `ContextMenu` | Menu de contexto genérico |

---

## Atalhos de Teclado

| Atalho | Ação |
|--------|------|
| `Cmd/Ctrl + P` | Quick Open |
| `Cmd/Ctrl + Shift + F` | Global Search |
| `Cmd/Ctrl + Shift + P` | Command Palette |
| `Cmd/Ctrl + B` | Toggle Sidebar |
| `Cmd/Ctrl + `` ` | Toggle Terminal |
| `Cmd/Ctrl + Shift + V` | Toggle Preview |
| `Cmd/Ctrl + S` | Salvar arquivo |
| `Cmd/Ctrl + Shift + S` | Salvar todos |
| `Cmd/Ctrl + ,` | Configurações |
| `Cmd/Ctrl + Tab` | Arquivos recentes |
| `Cmd/Ctrl + W` | Fechar tab |
| `Cmd/Ctrl + Shift + T` | Reabrir tab |
| `Alt + ←/→` | Navegar histórico |
| `Escape` | Fechar modal |

---

## Menus da Aplicação

### File

- Open Project (`Cmd/Ctrl + O`)
- New File (`Cmd/Ctrl + N`)
- Save (`Cmd/Ctrl + S`)
- Save All (`Cmd/Ctrl + Shift + S`)

### Edit

- Undo / Redo
- Cut / Copy / Paste
- Select All

### View

- Reload / Force Reload / DevTools
- Zoom In / Out / Reset
- Fullscreen
- Toggle Sidebar (`Cmd/Ctrl + B`)
- Toggle Terminal (`Cmd/Ctrl + ``)

### Go

- Quick Open (`Cmd/Ctrl + P`)
- Go to Symbol (`Cmd/Ctrl + Shift + O`)
- Go to Line (`Cmd/Ctrl + G`)
- Search in Files (`Cmd/Ctrl + Shift + F`)

### Window

- Minimize, Zoom (macOS)

### Help

- Documentation
- Report Issue

---

## Integração com Claude CLI

### Mapeamento de Agentes

```typescript
const AGENT_SKILLS: Record<AgentType, string> = {
  strategist: '/agents:strategist',
  architect: '/agents:architect',
  builder: '/agents:builder',
  guardian: '/agents:guardian',
  chronicler: '/agents:chronicler',
}
```

### Fluxo de Execução

1. Usuário seleciona agente e prompt na UI
2. Chamada IPC: `api.executeAgent(agent, prompt, cwd)`
3. Main process executa: `claude -p '/agents:strategist <prompt>'`
4. Captura stdout/stderr
5. Timeout de 5 minutos
6. Retorna resultado para renderer

---

## Build e Packaging

### Scripts npm

```bash
# Desenvolvimento
npm run dev              # Vite + Electron concorrente

# Build
npm run build            # Build renderer e main
npm run package          # Build + criar instaladores
npm run package:mac      # Instalador macOS
npm run package:win      # Instalador Windows
npm run package:linux    # Instalador Linux

# Outros
npm run rebuild          # Recompila módulos nativos
npm run typecheck        # Verificação de tipos
npm run lint             # ESLint
```

### Configuração Electron Builder

**macOS:**

```yaml
mac:
  category: public.app-category.developer-tools
  darkModeSupport: true
  hardenedRuntime: true
  target:
    - dmg
    - zip
  arch:
    - x64
    - arm64
```

**Windows:**

```yaml
win:
  target:
    - nsis
    - portable
  icon: resources/icon.ico
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
```

**Linux:**

```yaml
linux:
  target:
    - AppImage
    - deb
  category: Development
```

---

## Configurações de Build

### Vite (`vite.config.ts`)

```typescript
{
  root: 'src/renderer',
  build: { outDir: 'dist/renderer' },
  server: { port: 5173, strictPort: true },
  resolve: {
    alias: {
      '@': 'src/renderer',
      '@shared': 'src/shared'
    }
  },
  rollupOptions: {
    output: {
      manualChunks: {
        monaco: ['monaco-editor']  // Chunk separado
      }
    }
  }
}
```

### TypeScript

**Renderer (`tsconfig.json`):**
- Target: ES2020
- Module: ESNext
- JSX: react-jsx
- Paths: `@` e `@shared` aliases

**Main (`tsconfig.node.json`):**
- Target: ES2020
- Module: ESNext
- Sem JSX

### Tailwind (`tailwind.config.ts`)

```typescript
{
  darkMode: 'class',
  content: ['./src/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        // ...
      }
    }
  }
}
```

---

## Segurança

### Validações de Path

```typescript
// Previne path traversal
if (normalizedPath.includes('..')) {
  throw new Error('Path traversal not allowed')
}
```

### Diretórios Ignorados

```typescript
const IGNORED = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '__pycache__',
  '.cache'
]
```

### Terminal

- Sessões PTY isoladas por ID
- Buffer limitado a 1000 linhas
- Shell detectado por plataforma
- Terminal type: xterm-256color

---

## Tipos Principais

### FileTreeNode

```typescript
interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileTreeNode[]
}
```

### GitStatus

```typescript
interface GitStatus {
  branch: string
  staged: FileChange[]
  unstaged: FileChange[]
  untracked: string[]
  conflicts: string[]
}
```

### Spec

```typescript
interface Spec {
  id: string
  name: string
  description: string
  status: string
  tasks: Task[]
  filePath: string
}
```

### ProjectInfo

```typescript
interface ProjectInfo {
  path: string
  name: string
  stats: {
    specs: number
    stories: number
    adrs: number
    agents: number
  }
}
```

---

## Desenvolvimento

### Setup

```bash
cd desktop
npm install
npm run rebuild  # Compila módulos nativos (node-pty)
```

### Desenvolvimento

```bash
npm run dev
```

Isso inicia:
1. Vite dev server (porta 5173)
2. Electron com hot reload

### Type Check

```bash
npm run typecheck
```

### Build de Produção

```bash
npm run build
npm run package:mac  # ou :win ou :linux
```

---

## Referências

- [ARCHITECTURE.md](ARCHITECTURE.md) - Arquitetura geral
- [web.md](web.md) - Documentação do módulo web
- [INSTALLATION.md](INSTALLATION.md) - Guia de instalação

---

**DevFlow Desktop v0.1.0** - Desenvolvido por [Evolve Labs](https://evolvelabs.cloud)
