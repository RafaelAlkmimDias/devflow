# DevFlow Desktop

Versão desktop do DevFlow IDE usando Electron.

## Requisitos

- Node.js 18+
- npm ou yarn
- Python (para compilar node-pty)
- Ferramentas de build nativas:
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Windows**: Visual Studio Build Tools
  - **Linux**: `build-essential`, `python3`

## Setup

```bash
# Instalar dependências
npm install

# Rebuild native modules para Electron
npm run rebuild
```

## Desenvolvimento

```bash
# Rodar em modo desenvolvimento
npm run dev
```

Isso vai:
1. Iniciar o Vite dev server para o renderer (React)
2. Compilar o main process (TypeScript)
3. Iniciar o Electron

## Build

```bash
# Build para a plataforma atual
npm run package

# Build para plataformas específicas
npm run package:mac    # macOS (DMG + ZIP)
npm run package:win    # Windows (NSIS + Portable)
npm run package:linux  # Linux (AppImage + DEB)
```

Os instaladores serão gerados na pasta `release/`.

---

## Arquitetura

O projeto segue **Clean Architecture**, **SOLID**, **Clean Code** e **Atomic Design**.

### Estrutura de Pastas

```
src/
├── main/                    # Main Process (Electron/Node.js)
│   ├── index.ts             # Entry point
│   ├── window.ts            # Window management
│   ├── menu.ts              # Application menu
│   │
│   ├── domain/              # Regras de negócio puras
│   │   ├── agents/          # Constantes e lógica de agentes
│   │   ├── common/          # Utilitários compartilhados
│   │   ├── devflow/         # Templates de projeto
│   │   └── specs/           # Constantes de specs
│   │
│   ├── application/         # Services (casos de uso)
│   │   ├── AgentService.ts
│   │   ├── DevFlowService.ts
│   │   ├── FileService.ts
│   │   ├── GitService.ts
│   │   ├── RequirementsService.ts
│   │   ├── SearchService.ts
│   │   ├── SpecsService.ts
│   │   └── TerminalService.ts
│   │
│   └── ipc/                 # IPC Handlers (finos, delegam para services)
│       ├── autopilot.ts
│       ├── devflow.ts
│       ├── files.ts
│       ├── git.ts
│       ├── requirements.ts
│       ├── search.ts
│       ├── specs.ts
│       └── terminal.ts
│
├── renderer/                # Renderer Process (React)
│   ├── App.tsx
│   │
│   ├── domain/              # Lógica de negócio frontend
│   │   ├── autopilot/       # Orquestração, fases, prompts
│   │   └── types/           # Tipos de domínio
│   │
│   ├── application/         # Hooks de caso de uso
│   │   ├── useAgentExecution.ts
│   │   ├── useFileOperations.ts
│   │   └── useGitOperations.ts
│   │
│   ├── infrastructure/      # Adaptadores externos
│   │   └── api/             # Wrappers IPC (agentApi, fileApi, etc.)
│   │
│   ├── lib/                 # Utilitários e estado
│   │   ├── stores/          # Zustand stores
│   │   │   ├── utils/       # Helpers extraídos
│   │   │   ├── autopilotStore.ts
│   │   │   ├── fileStore.ts
│   │   │   └── gitStore.ts
│   │   ├── types/           # Tipos do renderer
│   │   └── utils.ts
│   │
│   └── components/          # Atomic Design
│       ├── atoms/           # Componentes básicos
│       ├── molecules/       # Combinações simples
│       ├── organisms/       # Componentes complexos
│       │   ├── AutopilotConfig/
│       │   ├── AutopilotProgress/
│       │   ├── CommandPalette/
│       │   ├── Dashboard/
│       │   ├── EditorTabs/
│       │   ├── FileExplorer/
│       │   ├── GitChanges/
│       │   ├── GlobalSearch/
│       │   ├── SpecsPanel/
│       │   └── TerminalWindow/
│       ├── agents/
│       ├── editor/
│       ├── layout/
│       ├── modals/
│       ├── settings/
│       └── ui/
│
├── preload/                 # Preload scripts (bridge)
│   └── index.ts
│
└── shared/                  # Tipos compartilhados main/renderer
    └── types.ts
```

### Padrões Adotados

#### SOLID

| Princípio | Aplicação |
|-----------|-----------|
| **S** - Single Responsibility | Cada classe/função tem uma única responsabilidade |
| **O** - Open/Closed | Extensível via composição, não modificação |
| **L** - Liskov Substitution | N/A (pouca herança no projeto) |
| **I** - Interface Segregation | Interfaces pequenas e específicas |
| **D** - Dependency Inversion | Dependências injetadas, não hardcoded |

#### Clean Code

- **Funções pequenas**: < 30 linhas
- **Nomes descritivos**: verbo + substantivo (`loadTree`, `saveFile`)
- **Sem comentários óbvios**: código auto-documentado
- **DRY**: lógica duplicada extraída para helpers

#### Nomenclatura

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Services | `XxxService` | `FileService`, `GitService` |
| IPC Handlers | `registerXxxHandlers()` | `registerFileHandlers()` |
| Hooks | `useXxx` | `useFileOperations`, `useTerminal` |
| Componentes | PascalCase | `TerminalWindow`, `GitPanel` |
| Utilitários | camelCase | `fileStoreUtils`, `sortOpenFiles` |

#### Atomic Design

| Nível | Descrição | Exemplo |
|-------|-----------|---------|
| **Atoms** | Elementos básicos | Button, Input, Icon |
| **Molecules** | Combinações simples | SearchInput, FileItem |
| **Organisms** | Componentes complexos | TerminalWindow, GitPanel |

#### Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────────┐
│                        RENDERER PROCESS                          │
├─────────────────────────────────────────────────────────────────┤
│  Component → Hook (application) → API (infrastructure) → IPC    │
│      ↑              ↓                                            │
│   Store ← ─ ─ ─ ─ state                                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓ IPC
┌─────────────────────────────────────────────────────────────────┐
│                         MAIN PROCESS                             │
├─────────────────────────────────────────────────────────────────┤
│  IPC Handler → Service (application) → Domain                    │
│                    ↓                                             │
│              External APIs (fs, git, pty)                        │
└─────────────────────────────────────────────────────────────────┘
```

### Regras de Arquitetura

1. **IPC Handlers são finos**: apenas validam e delegam para Services
2. **Services contêm a lógica**: operações de negócio e I/O
3. **Domain é puro**: sem dependências externas, apenas regras
4. **Stores são estado**: mínima lógica, máxima reatividade
5. **Componentes < 300 linhas**: decompostos em arquivos menores
6. **Hooks extraem lógica**: componentes focam em renderização

---

## Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Desenvolvimento com hot-reload |
| `npm run build` | Build de produção |
| `npm run typecheck` | Verificação de tipos TypeScript |
| `npm run lint` | Linting com ESLint |
| `npm run package` | Gerar instalador |

---

## Documentação Adicional

- [`PLANO_REFATORACAO.md`](./PLANO_REFATORACAO.md) - Histórico completo da refatoração
