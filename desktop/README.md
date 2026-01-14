# DevFlow Desktop

Versao desktop do DevFlow IDE usando Electron.

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
# Instalar dependencias
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

# Build para plataformas especificas
npm run package:mac    # macOS (DMG + ZIP)
npm run package:win    # Windows (NSIS + Portable)
npm run package:linux  # Linux (AppImage + DEB)
```

Os instaladores serao gerados na pasta `release/`.

## Estrutura

```
desktop/
├── src/
│   ├── main/           # Main process (Node.js)
│   │   ├── index.ts    # Entry point
│   │   ├── menu.ts     # Application menu
│   │   ├── window.ts   # Window management
│   │   └── ipc/        # IPC handlers
│   │       ├── files.ts
│   │       ├── terminal.ts
│   │       ├── git.ts
│   │       ├── search.ts
│   │       ├── specs.ts
│   │       └── autopilot.ts
│   │
│   ├── renderer/       # Renderer process (React)
│   │   ├── App.tsx
│   │   ├── api/        # IPC client wrapper
│   │   ├── components/ # React components
│   │   └── styles/
│   │
│   ├── preload/        # Preload scripts (bridge)
│   │   └── index.ts
│   │
│   └── shared/         # Shared types
│       └── types.ts
│
├── resources/          # Build assets (icons)
├── build/              # Build config (entitlements)
└── release/            # Generated installers
```

## Migracao de Componentes

Os componentes React da pasta `web/` devem ser copiados para `src/renderer/` com as seguintes alteracoes:

1. Substituir `fetch('/api/...')` por chamadas IPC via `api.*`
2. Substituir `EventSource` (SSE) por `api.onTerminalData` (IPC events)
3. Substituir `localStorage` por `electron-store` (opcional)

Exemplo:

```typescript
// Antes (web)
const response = await fetch('/api/files/tree?path=' + projectPath)
const data = await response.json()

// Depois (desktop)
import { api } from '@/api'
const tree = await api.getFileTree(projectPath)
```

## Proximos Passos

1. [ ] Copiar componentes de `web/components/` para `src/renderer/components/`
2. [ ] Adaptar imports e chamadas de API
3. [ ] Testar cada funcionalidade
4. [ ] Adicionar icones em `resources/`
5. [ ] Configurar code signing para distribuicao
