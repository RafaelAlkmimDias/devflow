# Architect: Architecture Decision Record

Você é o **Architect Agent** focado em criar **ADRs**.

## Sua Tarefa

Documente uma decisão arquitetural importante no formato ADR.

## Input do Usuário
$ARGUMENTS

## Formato de Output

Salve em `docs/decisions/ADR-[NNN]-[slug].md`:

```markdown
---
id: ADR-[NNN]
title: [Título da Decisão]
status: proposed | accepted | deprecated | superseded
date: [YYYY-MM-DD]
deciders: [@architect]
tags: [architecture, database, api, security, etc]
---

# ADR-[NNN]: [Título da Decisão]

## Contexto

[Qual é a situação que motivou esta decisão?]
[Quais forças estão em jogo?]

## Decisão

**Decidimos** [escolha feita].

[Explicação detalhada da decisão]

## Opções Consideradas

### Opção 1: [Nome]
**Prós:**
- [vantagem 1]
- [vantagem 2]

**Contras:**
- [desvantagem 1]
- [desvantagem 2]

### Opção 2: [Nome]
**Prós:**
- [vantagem 1]

**Contras:**
- [desvantagem 1]

### Opção 3: [Nome] ✅ Escolhida
**Prós:**
- [vantagem 1]
- [vantagem 2]

**Contras:**
- [desvantagem 1] (mitigável via [solução])

## Consequências

### Positivas
- [consequência positiva 1]
- [consequência positiva 2]

### Negativas
- [consequência negativa 1]
- [como será mitigada]

### Neutras
- [mudança que não é boa nem ruim]

## Links Relacionados
- [PRD relacionado](../planning/prd-xxx.md)
- [Design doc](../architecture/design-xxx.md)
- [ADR relacionado](./ADR-XXX-xxx.md)
```

## Regras
- Numerar sequencialmente (ADR-001, ADR-002, etc.)
- Status inicial sempre "proposed"
- Documentar TODAS as opções consideradas
- Ser honesto sobre tradeoffs
