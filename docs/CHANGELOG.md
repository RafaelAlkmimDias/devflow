# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - Documentação Técnica

- **docs/web.md**: Documentação completa do módulo Web IDE
  - Estrutura de diretórios detalhada
  - Tech stack completo (Next.js 16, React 18, Zustand, Monaco, xterm.js)
  - Documentação de todas as rotas e API endpoints
  - 7 Zustand stores documentados
  - Componentes organizados por categoria
  - Atalhos de teclado
  - Sistema de agentes e fluxo Autopilot
  - Sistema de tipos TypeScript

- **docs/desktop.md**: Documentação completa do aplicativo Desktop
  - Arquitetura Electron (main, preload, renderer)
  - Tech stack (Electron 33, Vite 6, node-pty)
  - 7 módulos IPC documentados (50+ handlers)
  - 6 Zustand stores
  - 25+ componentes React
  - Menus da aplicação
  - Build e packaging (macOS, Windows, Linux)
  - Integração com Claude CLI

### Changed

- **docs/ARCHITECTURE.md**: Adicionadas referências para web.md e desktop.md

---

## [0.6.0] - 2025-12-29

### Added - Permission Mode Configuration

- **ChatSettings Component**: Nova configuração de permissões no chat
  - Popover elegante com 3 modos de permissão
  - Auto-Accept Edits (recomendado para web)
  - Bypass All (para automação total)
  - Ask Permission (modo padrão do CLI)
  - Persistência em localStorage

- **Permission Mode API**: Suporte a permission mode dinâmico
  - `settingsStore.ts`: Nova configuração `chatPermissionMode`
  - `chatStore.ts`: Passa permissionMode para API
  - `/api/chat/route.ts`: Aceita e aplica permissionMode
  - Resolve problema de permissões bloqueando na web UI

### Changed - User Stories Completed

- **US-001 a US-010**: Todas marcadas como completed (testadas)
- **US-019**: UX Improvements - completed
- **US-020**: Performance Optimization - completed
- **US-021**: Automated Testing - deferred (para futura implementação)

### Fixed

- **Web UI Permission Blocking**: Claude CLI agora usa `--permission-mode acceptEdits` por padrão na web, evitando bloqueios de permissão que não podem ser respondidos na interface web

---

## [0.4.0] - 2025-12-26

### Added - Web IDE Complete

- **Web IDE Interface**: Interface visual completa para gerenciar projetos DevFlow
  - Dashboard Panel com métricas do projeto e health check
  - Specs Panel para visualizar requirements, design e tasks
  - File Explorer com context menu e navegação por teclado
  - Monaco Editor com syntax highlighting para 50+ linguagens
  - Terminal integrado via xterm.js
  - Chat com Claude direto na IDE
  - Settings Panel (Cmd+,) para configurar tema, fonte e terminal

- **Autopilot System**: Execute o pipeline DevFlow automaticamente
  - 5 fases sequenciais: Planning → Design → Implementation → Validation → Documentation
  - Execução simplificada sem streaming (mais estável)
  - Feedback visual do progresso

- **Keyboard Shortcuts**:
  - `Cmd+P` - Quick Open (arquivos)
  - `Cmd+Shift+F` - Busca global
  - `Cmd+Shift+P` - Command Palette
  - `Cmd+,` - Settings
  - `Cmd+S` - Salvar arquivo
  - `Cmd+W` - Fechar tab
  - `Cmd+Shift+T` - Reabrir tab fechada
  - `Cmd+[/]` - Navegação back/forward

- **Markdown Preview**: Suporte completo com:
  - GitHub Flavored Markdown (GFM)
  - Mermaid diagrams (lazy loaded)
  - Syntax highlighting para code blocks
  - Checkboxes, tabelas, blockquotes

- **Toast Notifications**: Sistema de feedback visual (sonner)
- **Skeleton Loaders**: Loading states para melhor UX
- **Image Support in Chat**: Paste (Ctrl+V), drag-drop, file picker

### Changed - Performance Optimizations

- **Mermaid Diagrams**: Lazy loaded com React.lazy() + Suspense
- **MarkdownPreview Components**: Memoizados com useMemo
- **FileTree Component**: React.memo com comparação customizada
- **Zustand Selectors**: Selectors específicos ao invés de subscribe ao store inteiro
- **Terminal Writes**: Buffering com debounce (10ms) para reduzir chamadas de rede

### Changed - Autopilot Simplification

- Removido SSE streaming (causa de instabilidade)
- Execução sequencial com fetch por fase
- Removido pause/resume/cancel (simplificação)
- Removido checkpoints (complexidade desnecessária)
- Timeout aumentado para 5 minutos por fase

### Fixed - Stability

- **Autopilot JSON Parsing**: Resolvido erros de parse em streaming
- **Autopilot Timeouts**: Execução mais estável sem SSE
- **FileTree Re-renders**: Memoização previne re-renders desnecessários
- **Terminal Performance**: Buffering reduz latência de input

### Removed

- Knowledge Graph visualization (complexidade vs uso)
- Kanban Board (movido para futura versão)
- Checkpoints no Autopilot

### Tech Stack (Web IDE)

- **Next.js 16** - Framework React com App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Monaco Editor** - Code editing (VS Code engine)
- **xterm.js** - Terminal emulation
- **Zustand** - State management
- **Lucide Icons** - Iconografia
- **Sonner** - Toast notifications
- **Mermaid** - Diagramas (lazy loaded)

---

## [0.3.0] - 2025-12-05

### Added - Hard Stops & Mandatory Delegation

- **Hard Stops em todos os agentes**: Seção `🚨 REGRAS CRÍTICAS - LEIA PRIMEIRO` no topo de cada arquivo `.md`
- **Regras de NUNCA FAÇA**: Instruções explícitas `⛔ NUNCA FAÇA (HARD STOP)` com lógica IF/THEN para parar e delegar
- **Regras de SEMPRE FAÇA**: Instruções `✅ SEMPRE FAÇA (OBRIGATÓRIO)` para delegação mandatória
- **Geração automática de stories**: Chronicler agora DEVE gerar user stories se strategist não criar
- **Checklist pós-ação**: Chronicler executa verificações após qualquer agente completar tarefa
- **Detection patterns**: Padrões de código em `strategist.meta.yaml` para detectar violações de escopo
- **Mandatory delegation triggers**: Em todos os `.meta.yaml` com regras de quando delegar

### Changed - Orchestration System

- **`.claude_project`**: Adicionadas regras obrigatórias de orquestração no topo do arquivo
- **`strategist.md`**: Hard stops para nunca escrever código, sempre delegar para architect/builder
- **`strategist.meta.yaml`**: Versão 1.1.0 com `hard_stops` e `mandatory_delegation` sections
- **`architect.md`**: Hard stops para apenas exemplos de código, nunca produção
- **`builder.md`**: Hard stops para verificar design antes de implementar, delegar após implementar
- **`guardian.md`**: Hard stops e fluxo de aprovação/rejeição com delegação
- **`chronicler.md`**: Ações automáticas obrigatórias e geração de stories
- **`chronicler.meta.yaml`**: Versão 1.1.0 com `mandatory_actions` para cada evento

### Fixed - Agent Role Violations

- **Bug**: Strategist escrevia código ao invés de delegar para builder
  - **Solução**: Hard stops explícitos + detection patterns para keywords de código
- **Bug**: Stories não eram geradas automaticamente
  - **Solução**: Chronicler agora tem trigger obrigatório `after_strategist_prd`
- **Bug**: Documentação não era atualizada após implementações
  - **Solução**: Checklist pós-ação em chronicler com verificações automáticas

### Benefits - Por que isso melhora?

- **Zero violações de papel**: Agentes param imediatamente ao detectar ação fora do escopo
- **Delegação garantida**: Fluxo obrigatório strategist → architect → builder → guardian → chronicler
- **Stories sempre disponíveis**: Se strategist não criar, chronicler gera automaticamente
- **Documentação sincronizada**: Checklist automático garante docs atualizados
- **Detecção proativa**: Patterns de código identificam quando strategist tenta implementar

## [0.2.0] - 2025-11-15

### Added - Metadata Estruturada (IA-Optimized)
- **`.devflow/project.yaml`**: Metadata estruturada do projeto para parse rápido pela IA
- **`.devflow/agents/*.meta.yaml`**: Metadata YAML para cada agente (5 arquivos)
- **Knowledge Graph**: `.devflow/knowledge-graph.json` conectando decisões, features, agentes e documentos
- **Snapshots Estruturados**: `docs/snapshots/2025-11-15.json` (além do .md)
- **ADR com YAML Frontmatter**: Template atualizado com metadata estruturada
- **ADR-001**: Decisão formal documentada - "5 Agentes ao invés de 19+"
- **Build System**: `build-release.sh` para gerar releases limpas
- **Release Structure**: `release/v0.2.0/` com estrutura pronta para distribuição
- **Release Docs**: `RELEASE.md` com processo completo de release

### Changed - Metadata Layer
- Template ADR (`docs/decisions/000-template.md`) agora inclui YAML frontmatter completo
- Snapshots agora disponíveis em 2 formatos: .md (humanos) + .json (IA)
- Sistema de tags implementado em ADRs para queries rápidas
- Estrutura separada: desenvolvimento vs release

### Benefits - Por que isso melhora?
- **Parse 100x mais rápido**: IA lê JSON em milissegundos vs. interpretar markdown
- **Zero ambiguidade**: Dados estruturados eliminam interpretação incorreta
- **Knowledge Graph**: IA vê todas as conexões entre decisões, features e agentes instantaneamente
- **Queries complexas**: IA pode responder "Quais decisões impactam X?" sem grep
- **Contexto preservado**: Metadata garante que nada seja esquecido entre sessões
- **Distribuição limpa**: Release separada de arquivos de desenvolvimento

## [0.1.0] - 2025-11-15

### Added - Release Inicial
- Sistema DevFlow multi-agentes implementado
- 5 agentes especializados:
  - Strategist (Planejamento & Produto)
  - Architect (Design & Arquitetura)
  - Builder (Implementação)
  - Guardian (Qualidade & Segurança)
  - Chronicler (Documentação & Memória)
- Estrutura de documentação automática
- Sistema de snapshots para prevenir drift de contexto
- Workflow adaptativo (4 níveis de complexidade)
- Documentação completa de instalação em `docs/INSTALLATION.md`
- Guia de quick start em `docs/QUICKSTART.md`
- Documentação de arquitetura em `docs/ARCHITECTURE.md`

### Changed
- Reorganizada estrutura de pastas: toda documentação movida para `docs/`
- README.md simplificado com foco em instalação rápida
- Estrutura mais clara: código do usuário separado de documentação DevFlow
- Pastas `architecture/` e `planning/` movidas para dentro de `docs/` para centralização completa

### Fixed
- Script `install.sh` atualizado para refletir nova estrutura de pastas
- Links quebrados corrigidos em `docs/ARCHITECTURE.md`
- Arquivo `.claude_project` atualizado com estrutura correta
- Adicionados arquivos `.gitkeep` em pastas vazias (api, migration, architecture/diagrams, planning/stories)

---

<!-- O Chronicler manterá este arquivo atualizado automaticamente -->
<!-- Não edite manualmente - use @chronicler /document -->
