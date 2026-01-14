# DevFlow Web - Documentação Técnica

Documentação completa do módulo web do DevFlow - uma IDE web para desenvolvimento spec-driven com agentes de IA.

---

## Visão Geral

O DevFlow Web é uma interface web estilo VS Code construída com Next.js 16, oferecendo:

- **File Explorer** com navegação em árvore
- **Editor de código** Monaco com syntax highlighting
- **Terminal integrado** com PTY real
- **Painel Git** para controle de versão
- **Sistema Autopilot** para execução sequencial de agentes
- **Gerenciamento de Specs** para requisitos e tarefas

```
┌────────────────────────────────────────────────────────────┐
│  Activity Bar │  Sidebar  │      Editor Tabs              │
│               │           │  ┌──────────────────────────┐ │
│   [Explorer]  │  File     │  │                          │ │
│   [Git]       │  Tree     │  │     Monaco Editor        │ │
│   [Specs]     │           │  │                          │ │
│   [Dashboard] │           │  └──────────────────────────┘ │
│               │           │  ┌──────────────────────────┐ │
│               │           │  │     Terminal Panel       │ │
│               │           │  └──────────────────────────┘ │
├────────────────────────────────────────────────────────────┤
│                        Status Bar                          │
└────────────────────────────────────────────────────────────┘
```

---

## Estrutura de Diretórios

```
web/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Layout raiz
│   ├── page.tsx                 # Homepage (seleção de projeto)
│   ├── globals.css              # Estilos Tailwind
│   ├── ide/
│   │   ├── layout.tsx
│   │   └── page.tsx             # Página principal da IDE
│   └── api/                     # Rotas API (server-side)
│       ├── autopilot/execute/   # Execução de agentes
│       ├── files/               # Operações de arquivos
│       ├── git/                 # Operações Git
│       ├── health/              # Health check
│       ├── project/open/        # Abertura de projetos
│       ├── search/              # Busca full-text
│       ├── specs/               # Gerenciamento de specs
│       └── terminal/            # Sessões de terminal
│
├── components/                   # Componentes React (~7,400 LOC)
│   ├── agents/                  # UI de agentes
│   ├── autopilot/               # Painel e config do autopilot
│   ├── dashboard/               # Dashboard do projeto
│   ├── editor/                  # Monaco, tabs, preview
│   ├── explorer/                # File tree, context menu
│   ├── git/                     # Painel Git
│   ├── layout/                  # Sidebar, StatusBar
│   ├── modals/                  # QuickOpen, GlobalSearch, etc.
│   ├── settings/                # Configurações
│   ├── specs/                   # Painel de especificações
│   ├── terminal/                # Terminal xterm.js
│   └── ui/                      # Primitivos UI reutilizáveis
│
├── hooks/                       # Custom React hooks
│   ├── useFocusTrap.ts
│   ├── useKeyboardShortcuts.ts
│   ├── useListNavigation.ts
│   └── useTreeNavigation.ts
│
├── lib/
│   ├── stores/                  # Zustand stores (~1,800 LOC)
│   │   ├── projectStore.ts
│   │   ├── fileStore.ts
│   │   ├── uiStore.ts
│   │   ├── autopilotStore.ts
│   │   ├── specsStore.ts
│   │   ├── gitStore.ts
│   │   └── settingsStore.ts
│   ├── types/index.ts           # Definições de tipos
│   ├── constants/agents.ts      # Configuração dos agentes
│   ├── utils.ts                 # Utilitários
│   ├── git.ts                   # Helpers Git
│   ├── ptyManager.ts            # Gerenciador PTY
│   └── specsParser.ts           # Parser de specs
│
├── package.json                 # v0.6.0
├── tsconfig.json
├── next.config.js
└── tailwind.config.ts
```

---

## Tech Stack

| Categoria | Tecnologia | Versão |
|-----------|------------|--------|
| **Framework** | Next.js | 16.1.0 |
| **UI** | React | 18.3.1 |
| **Linguagem** | TypeScript | 5.9.3 |
| **Styling** | Tailwind CSS | 3.4.17 |
| **State** | Zustand | 5.0.2 |
| **Editor** | Monaco Editor | 4.6.0 |
| **Terminal** | xterm.js | 5.3.0 |
| **PTY** | node-pty | 1.0.0 |
| **Git** | simple-git | 3.30.0 |
| **UI Components** | Radix UI | latest |
| **Icons** | Lucide React | 0.468.0 |
| **Markdown** | react-markdown | 9.0.1 |
| **Diagramas** | Mermaid | 11.4.0 |
| **Toasts** | Sonner | 2.0.7 |

---

## Rotas e Páginas

### Páginas (App Router)

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/` | `app/page.tsx` | Homepage - seleção de projeto |
| `/ide` | `app/ide/page.tsx` | Interface principal da IDE |

### API Routes

| Endpoint | Métodos | Descrição |
|----------|---------|-----------|
| `/api/project/open` | POST | Abre e valida projeto |
| `/api/health` | GET | Health check do sistema |
| `/api/files` | GET, PUT, POST, DELETE, PATCH | CRUD de arquivos |
| `/api/files/tree` | GET | Árvore de arquivos do projeto |
| `/api/git` | GET, POST | Operações Git |
| `/api/terminal` | POST, GET | Sessões de terminal |
| `/api/specs` | GET, POST, PATCH | Gerenciamento de specs |
| `/api/search` | GET | Busca full-text |
| `/api/autopilot/execute` | POST | Executa agente Claude |

---

## Gerenciamento de Estado (Zustand)

### projectStore

Gerencia o projeto atual e histórico.

```typescript
interface ProjectState {
  currentProject: ProjectInfo | null
  recentProjects: RecentProject[]
  health: HealthStatus | null
  isLoading: boolean
  error: string | null
}

// Actions
openProject(path: string)
closeProject()
refreshHealth()
```

### fileStore

Gerencia arquivos abertos, tabs e navegação.

```typescript
interface FileState {
  tree: FileNode | null
  openFiles: OpenFile[]
  activeFile: string | null
  expandedFolders: Set<string>
  pinnedFiles: Set<string>
  tabHistory: string[]
  recentFiles: string[]
  closedTabs: ClosedTab[]
}

// Actions
loadTree(projectPath: string)
openFile(path: string)
closeFile(path: string)
saveFile(path: string)
createFile(parentPath: string, name: string)
deleteFile(path: string)
renameFile(oldPath: string, newName: string)
navigateBack() / navigateForward()
togglePinned(path: string)
reopenClosedTab()
```

### uiStore

Controla estado da interface.

```typescript
interface UIState {
  theme: 'dark' | 'light'
  sidebarVisible: boolean
  sidebarWidth: number
  activePanel: 'explorer' | 'git' | 'specs' | 'dashboard'
  terminalVisible: boolean
  terminalHeight: number
  terminalMaximized: boolean
  activeModal: ModalType | null
  selectedModel: string
}
```

### gitStore

Integração com Git.

```typescript
interface GitState {
  status: GitStatus | null
  commits: Commit[]
  branches: Branch[]
  selectedFiles: Set<string>
  diffContent: string | null
  diffFile: string | null
}

// Actions
fetchStatus(projectPath: string)
stageFiles(projectPath: string, files: string[])
unstageFiles(projectPath: string, files: string[])
commit(projectPath: string, message: string)
push(projectPath: string)
pull(projectPath: string)
checkout(projectPath: string, branch: string)
createBranch(projectPath: string, name: string)
```

### autopilotStore

Controle de execução dos agentes.

```typescript
interface AutopilotState {
  status: 'idle' | 'running' | 'completed' | 'failed'
  currentPhaseIndex: number
  phases: PhaseResult[]
  isConfigModalOpen: boolean
  selectedSpec: SpecInfo | null
}

// Fases de execução
phases: ['strategist', 'architect', 'builder', 'guardian', 'chronicler']
```

### specsStore

Gerenciamento de especificações.

```typescript
interface SpecsState {
  specs: Spec[]
  requirements: Requirement[]
  decisions: DesignDecision[]
  tasks: Task[]
  selectedSpecId: string | null
  activePhase: 'requirements' | 'design' | 'tasks'
}
```

### settingsStore

Preferências do usuário.

```typescript
interface SettingsState {
  settingsOpen: boolean
  theme: string
  model: string
}
```

---

## Componentes Principais

### Layout

| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| `IDEPage` | `app/ide/page.tsx` | Container principal |
| `Sidebar` | `components/layout/Sidebar.tsx` | Barra lateral |
| `StatusBar` | `components/layout/StatusBar.tsx` | Barra de status |

### Editor

| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| `EditorPanel` | `components/editor/EditorPanel.tsx` | Container do editor |
| `EditorTabs` | `components/editor/EditorTabs.tsx` | Tabs de arquivos |
| `MonacoEditor` | `components/editor/MonacoEditor.tsx` | Editor Monaco |
| `MarkdownPreview` | `components/editor/MarkdownPreview.tsx` | Preview de Markdown |
| `MermaidDiagram` | `components/editor/MermaidDiagram.tsx` | Renderiza diagramas |
| `Breadcrumbs` | `components/editor/Breadcrumbs.tsx` | Navegação de path |

### Explorer

| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| `FileExplorer` | `components/explorer/FileExplorer.tsx` | Container |
| `FileTree` | `components/explorer/FileTree.tsx` | Árvore de arquivos |
| `FileContextMenu` | `components/explorer/FileContextMenu.tsx` | Menu de contexto |

### Modais

| Componente | Atalho | Descrição |
|------------|--------|-----------|
| `QuickOpen` | `Cmd+P` | Busca de arquivos |
| `GlobalSearch` | `Cmd+Shift+F` | Busca full-text |
| `CommandPalette` | `Cmd+Shift+P` | Paleta de comandos |
| `RecentFiles` | `Cmd+Tab` | Arquivos recentes |

### Painéis

| Componente | Descrição |
|------------|-----------|
| `GitPanel` | Controle de versão |
| `SpecsPanel` | Requisitos e tarefas |
| `TerminalPanel` | Terminal integrado |
| `DashboardPanel` | Estatísticas do projeto |
| `SettingsPanel` | Configurações |
| `AutopilotPanel` | Execução de agentes |

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
| `Cmd/Ctrl + S` | Save File |
| `Cmd/Ctrl + ,` | Settings |
| `Cmd/Ctrl + Tab` | Recent Files |
| `Cmd/Ctrl + W` | Close Tab |
| `Cmd/Ctrl + Shift + T` | Reopen Closed Tab |
| `Alt + ←/→` | Navigate Back/Forward |
| `Escape` | Close Modal |

---

## Sistema de Agentes

### Os 5 Agentes

| Agente | Cor | Função |
|--------|-----|--------|
| **@strategist** | Azul (#3B82F6) | Product Manager - Planning & Requirements |
| **@architect** | Roxo (#8B5CF6) | Solutions Architect - Design & ADRs |
| **@builder** | Laranja (#F59E0B) | Senior Developer - Implementation |
| **@guardian** | Verde (#10B981) | QA Engineer - Testing & Security |
| **@chronicler** | Rosa (#EC4899) | Technical Writer - Documentation |

### Fluxo de Execução (Autopilot)

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Strategist │ ─► │  Architect  │ ─► │   Builder   │
└─────────────┘    └─────────────┘    └─────────────┘
                                             │
                                             ▼
                   ┌─────────────┐    ┌─────────────┐
                   │  Chronicler │ ◄─ │  Guardian   │
                   └─────────────┘    └─────────────┘
```

### API de Execução

```typescript
POST /api/autopilot/execute
{
  agent: 'strategist' | 'architect' | 'builder' | 'guardian' | 'chronicler',
  specContent: string,
  previousOutputs: string[],
  projectPath: string
}

// Response
{
  success: boolean,
  output: string,
  error?: string
}
```

---

## Sistema de Tipos

### Arquivos

```typescript
interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  extension?: string
  children?: FileNode[]
  size?: number
  modifiedAt?: string
}

interface OpenFile {
  path: string
  name: string
  content: string
  originalContent: string
  isDirty: boolean
  language: string
}
```

### Specs

```typescript
interface Spec {
  id: string
  name: string
  description: string
  phase: 'requirements' | 'design' | 'tasks'
  status: 'draft' | 'approved' | 'implemented'
  filePath: string
}

interface Requirement {
  id: string
  specId: string
  title: string
  type: 'functional' | 'non-functional'
  priority: 'high' | 'medium' | 'low'
  acceptanceCriteria: string[]
  status: 'draft' | 'approved' | 'implemented'
}

interface Task {
  id: string
  specId: string
  title: string
  status: 'pending' | 'in_progress' | 'completed' | 'blocked'
  priority: 'high' | 'medium' | 'low'
  dependencies: string[]
  assignedAgent?: string
}
```

### Projeto

```typescript
interface ProjectInfo {
  path: string
  name: string
  isValid: boolean
  hasDevflow: boolean
  hasClaudeProject: boolean
  stats: ProjectStats
}

interface ProjectStats {
  specs: number
  stories: number
  adrs: number
  agents: number
}
```

---

## Estilização

### Sistema de Cores (Tailwind)

```typescript
// tailwind.config.ts
colors: {
  background: 'var(--background)',
  foreground: 'var(--foreground)',
  border: 'var(--border)',
  muted: 'var(--muted)',
  accent: 'var(--accent)',

  // Cores dos agentes
  'agent-strategist': '#3B82F6',
  'agent-architect': '#8B5CF6',
  'agent-builder': '#F59E0B',
  'agent-guardian': '#10B981',
  'agent-chronicler': '#EC4899',
}
```

### Fontes

```css
/* Primary */
font-family: 'Inter', sans-serif;

/* Monospace */
font-family: 'JetBrains Mono', 'Fira Code', monospace;
```

### Tamanhos de Layout

| Elemento | Min | Default | Max |
|----------|-----|---------|-----|
| Sidebar | 200px | 280px | 500px |
| Terminal | 150px | 200px | 600px |
| Chat Panel | 320px | 420px | 600px |
| Specs Panel | 250px | 300px | 450px |

---

## Segurança

### Validações

- **Path Traversal**: Bloqueio de `..` em paths
- **File Size**: Limite de 5MB para leitura
- **Acesso**: Validação de permissões de arquivo
- **Timeout**: Execução de agentes com timeout (5-20 min)

### Dependências do Claude CLI

O sistema Autopilot requer o Claude CLI instalado:

```bash
# Verificar instalação
claude --version
```

---

## Scripts npm

```bash
# Desenvolvimento
npm run dev           # Inicia servidor dev

# Build
npm run build         # Build de produção
npm run start         # Inicia produção

# Lint
npm run lint          # ESLint
```

---

## Variáveis de Ambiente

```bash
# .env.local (exemplo)
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## Referências

- [ARCHITECTURE.md](ARCHITECTURE.md) - Arquitetura geral
- [INSTALLATION.md](INSTALLATION.md) - Guia de instalação
- [QUICKSTART.md](QUICKSTART.md) - Quick Start

---

**DevFlow Web v0.6.0** - Desenvolvido por [Evolve Labs](https://evolvelabs.cloud)
