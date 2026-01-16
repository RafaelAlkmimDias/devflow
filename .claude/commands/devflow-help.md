# DevFlow - Guia Completo dos Agentes

Você está usando **DevFlow v0.3.0** - Sistema multi-agentes para desenvolvimento.

## 🤖 Os 5 Agentes

### @strategist - Planejamento & Produto
**Use quando:** Iniciar nova feature, criar requisitos, definir prioridades
**Output:** PRDs, User Stories, Product Specs
**Exemplo:** `@strategist Criar dashboard de analytics`

### @architect - Design & Arquitetura
**Use quando:** Decisões técnicas, escolha de tech stack, design de sistemas
**Output:** ADRs, Database schemas, API design
**Exemplo:** `@architect Design sistema de autenticação`

### @builder - Implementação
**Use quando:** Escrever código, implementar features, refactoring
**Output:** Código, testes unitários, reviews
**Exemplo:** `@builder Implementar login com JWT`

### @guardian - Qualidade & Segurança
**Use quando:** Testes, security audit, performance review
**Output:** Testes E2E, security reports, performance audits
**Exemplo:** `@guardian Revisar segurança da API`

### @chronicler - Documentação & Memória
**Use quando:** Documentar feature, criar changelog, snapshots
**Output:** CHANGELOG, Snapshots, Documentation
**Exemplo:** `@chronicler Documentar nova feature`

---

## 🔄 Fluxo de Trabalho

```
@strategist → @architect → @builder → @guardian → @chronicler
```

1. **Planejamento** (@strategist): Define o QUÊ fazer
2. **Design** (@architect): Define COMO fazer tecnicamente
3. **Implementação** (@builder): Faz acontecer
4. **Qualidade** (@guardian): Garante que está correto
5. **Documentação** (@chronicler): Registra para sempre

---

## ⚡ Slash Commands

### Comandos Gerais
- `/devflow-status` - Ver estado atual do projeto
- `/devflow-help` - Este guia

### Quick Commands
- `/quick:new-feature` - Iniciar nova feature (wizard guiado)
- `/quick:create-adr` - Criar Architecture Decision Record
- `/quick:security-check` - Audit de segurança rápido

### Strategist (Planejamento)
- `/strategist:analyze` - Análise profunda de um problema
- `/strategist:prd` - Criar Product Requirements Document
- `/strategist:stories` - Quebrar feature em user stories
- `/strategist:prioritize` - Priorizar lista de features (RICE)

### Architect (Design)
- `/architect:design` - Design técnico de sistema
- `/architect:adr` - Criar Architecture Decision Record
- `/architect:diagram` - Criar diagramas Mermaid
- `/architect:review-arch` - Review de arquitetura

### Builder (Implementação)
- `/builder:implement` - Implementar uma story
- `/builder:review` - Code review
- `/builder:refactor` - Refatorar código
- `/builder:debug` - Investigar e resolver bugs

### Guardian (Qualidade)
- `/guardian:test-plan` - Criar plano de testes
- `/guardian:security-audit` - Auditoria de segurança
- `/guardian:perf-review` - Review de performance
- `/guardian:ci-setup` - Configurar CI/CD

### Chronicler (Documentação)
- `/chronicler:document` - Documentar feature
- `/chronicler:update-docs` - Atualizar docs após mudanças
- `/chronicler:snapshot` - Criar snapshot do projeto
- `/chronicler:sync-check` - Verificar sync código/docs
- `/chronicler:decision` - Registrar decisão

---

## 📁 Estrutura do Projeto

```
.devflow/
├── agents/              # 5 agentes especializados
├── snapshots/           # Histórico do projeto
├── project.yaml         # Estado atual
└── knowledge-graph.json # Conexões entre decisões

docs/
├── decisions/           # ADRs (Architecture Decision Records)
├── planning/stories/    # User stories
├── security/            # Security audits
└── performance/         # Performance reports
```

---

## 💡 Dicas

- **Hard Stops**: Cada agente tem limites rígidos - não pode fazer trabalho de outro
- **Delegação Obrigatória**: Sempre seguir o fluxo correto
- **Memória Automática**: @chronicler mantém tudo documentado
- **Zero Config**: Funciona sem configuração adicional

---

**Pronto para começar?**
`@strategist Olá! Quero criar [sua feature]`
