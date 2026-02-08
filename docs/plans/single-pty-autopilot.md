# Otimização: PTY Único para Autopilot

## Contexto

Hoje cada agente do autopilot abre um processo `claude -p` independente via PTY. Como os processos não compartilham memória, todo o contexto (spec, outputs anteriores, decisões do usuário) precisa ser re-enviado no prompt de cada agente, causando crescimento quadrático de tokens (~170K tokens por run de 6 agentes).

A proposta é usar **um único processo `claude` interativo** para toda a run do autopilot, onde cada agente é invocado como um comando dentro da mesma sessão. O Claude CLI mantém o contexto internamente, eliminando a necessidade de re-enviar qualquer coisa.

**Economia estimada: ~95% dos tokens que controlamos (de ~114K para ~5K).**

---

## Arquitetura Atual vs. Proposta

### Atual (N processos)
```
Agente 1: pty.spawn → claude -p "/agents:strategist <SPEC + PROMPT>"     → exit
Agente 2: pty.spawn → claude -p "/agents:architect  <SPEC + OUTPUT1>"    → exit
Agente 3: pty.spawn → claude -p "/agents:builder    <SPEC + OUT1+OUT2>"  → exit
```

### Proposta (1 processo)
```
pty.spawn → claude --allowedTools "Edit,Write,Read,Glob,Grep,Bash"
  ← CLI pronto (detectar prompt "❯" ou similar)
  → escreve: "/agents:strategist Analise esta spec: <SPEC>"
  ← resposta do strategist (detectar fim via idle do output)
  → escreve: "/agents:architect Continue o design baseado na análise anterior"
  ← resposta do architect (contexto do strategist já está na sessão)
  → escreve: "/agents:builder Implemente a solução"
  ← resposta do builder (contexto de TODOS os agentes anteriores na sessão)
```

---

## Desafios Técnicos e Soluções

### 1. Detecção de fim de resposta de cada agente

**Problema:** Sem `-p`, o processo não termina após cada resposta. Precisamos saber quando o agente terminou de responder para enviar o próximo prompt.

**Solução: Detecção de idle + marker de status**

**Mecanismo primário: STATUS markers obrigatórios em todos os agentes.**

Todos os agentes DEVEM emitir um status marker explícito ao final do trabalho. Sem marker = resposta não é considerada completa. Isso elimina falsos positivos por idle.

Markers:

| Marker | Significado | Quando é emitido |
|--------|-------------|------------------|
| `[STATUS: READY_TO_PROCEED]` | Agente terminou, pode prosseguir ao próximo | Agentes intermediários |
| `[STATUS: DONE]` | Último agente terminou, run completa | Último agente da run |
| `[STATUS: AWAITING_INPUT]` | Agente precisa de input do usuário | Qualquer agente |

O PromptBuilder inclui no prompt de cada agente qual marker emitir:
- Agentes 1 a N-1: `"Ao finalizar, emita [STATUS: READY_TO_PROCEED]"`
- Agente N (último): `"Ao finalizar, emita [STATUS: DONE]"`
- Todos: `"Se precisar de input do usuário, emita [STATUS: AWAITING_INPUT]"`

Fluxo:

1. Enviar prompt do agente via `ptyProcess.write()`
2. Acumular output no buffer
3. A cada chunk de dados, verificar se os últimos 500 chars contêm um `[STATUS:]` marker
4. Se `READY_TO_PROCEED` ou `DONE` → agente terminou, resolver a promise, prosseguir
5. Se `AWAITING_INPUT` → agente fez pergunta, notificar o renderer, aguardar input do usuário
6. Se nenhum marker após timeout de 15min → timeout, enviar Ctrl+C

**Fallback de segurança (apenas para timeout):** Se após 15 minutos nenhum marker foi emitido, considerar timeout e cancelar o agente com Ctrl+C. Isso cobre o caso raro de o agente travar sem emitir marker.

```typescript
// Pseudocódigo da detecção
private detectResponseEnd(buffer: string): 'ready' | 'done' | 'awaiting' | null {
  const tail = buffer.slice(-500)

  if (/\[STATUS:\s*DONE\]/i.test(tail)) return 'done'
  if (/\[STATUS:\s*READY_TO_PROCEED\]/i.test(tail)) return 'ready'
  if (/\[STATUS:\s*AWAITING_INPUT\]/i.test(tail)) return 'awaiting'

  return null  // Não está pronto — NÃO usar idle como critério
}
```

**Atualização necessária nos skills (.md):** Garantir que cada agent skill inclua a instrução de emitir o marker correto. O PromptBuilder reforça isso no prompt enviado, mas o ideal é que os skills já incluam essa convenção.

### 2. Timeout por agente (não por processo)

**Problema:** O PTY fica vivo a run inteira. O timeout de 15min não pode matar o processo, senão perde todos os agentes.

**Solução: Timeout por agente com cancel graceful**

- Manter um timer por agente (não por processo)
- Se timeout, enviar `Ctrl+C` (`\x03`) ao PTY para cancelar a resposta atual
- Marcar o agente como failed
- O processo continua vivo para os próximos agentes

```typescript
// Quando o agente excede o timeout:
ptyProcess.write('\x03')  // Ctrl+C para cancelar resposta atual
// Aguardar CLI voltar ao prompt
// Prosseguir com próximo agente ou marcar como failed
```

### 3. Erro em um agente

**Problema:** Se um agente falha (erro do Claude, rate limit, etc.), o processo não deve morrer.

**Solução: Detecção de erro no output + recovery**

- Detectar mensagens de erro no output (ex: `Error:`, `rate limit`, etc.)
- Se erro detectado, marcar agente como failed
- Aguardar o CLI voltar ao prompt
- Decidir: prosseguir com próximo agente ou parar (conforme config do usuário)

Se o **processo inteiro morrer** (crash do CLI):
- O `onExit` handler detecta e marca todos os agentes restantes como failed
- Status → `interrupted`, permitindo resume
- No resume, criar novo PTY e re-enviar spec (perde contexto — degradação graceful para o modelo atual)

### 4. Resposta do usuário a perguntas

**Problema:** Quando o agente emite `[STATUS: AWAITING_INPUT]`, precisamos pausar e esperar o usuário.

**Solução: Mesmo fluxo, mas simplificado**

- Detectar `AWAITING_INPUT` no buffer
- Emitir evento `question` ao renderer (igual ao atual)
- Quando o usuário responde, escrever a resposta direto no PTY: `ptyProcess.write(response + '\n')`
- O Claude CLI recebe como input e o agente continua **na mesma sessão** — sem criar novo PTY, sem re-enviar contexto

**Diferença crucial vs. atual:** Hoje o `continuePhase` cria um novo PTY com `buildContinuationPrompt` que re-envia spec + outputs + lastOutput + resposta (~45K tokens). Na proposta, é apenas `ptyProcess.write(resposta)` (~50 tokens).

### 5. Gestão do context window do Claude CLI

**Problema:** Com ~200K tokens de context window, uma run longa pode enchê-lo.

**Solução: Confiar no auto-compaction do Claude CLI**

O Claude CLI já possui mecanismo de auto-compaction quando o contexto se aproxima do limite. Não precisamos gerenciar isso — é responsabilidade do CLI. Na prática, uma run de 6 agentes fica bem dentro do limite.

### 6. Skip to next agent

**Problema:** Quando o usuário quer pular a pergunta de um agente e ir ao próximo.

**Solução: Enviar resposta de skip + próximo prompt**

```typescript
// Escrever uma resposta indicando skip
ptyProcess.write('Skip this question, proceed.\n')
// Aguardar resposta terminar
// Enviar prompt do próximo agente
```

### 7. Cancel/abort da run inteira

**Problema:** Usuário quer cancelar todo o autopilot.

**Solução: Kill do PTY**

```typescript
ptyProcess.kill()  // Encerra o processo inteiro
// Marcar agentes restantes como 'skipped'
// Status → 'interrupted'
```

### 8. Resume após interrupção

**Problema:** Se o app fecha ou o PTY morre, como retomar?

**Solução: Degradação graceful para multi-PTY**

O resume cria um **novo PTY** e re-envia apenas a spec + um resumo dos agentes já concluídos. É o único cenário onde re-enviamos contexto. Para minimizar o custo:
- Armazenar `phase.output` com os últimos 500 chars de cada agente (já feito no history)
- No resume, enviar: `spec + "Agentes já concluídos: [resumos]" + prompt do próximo agente`

---

## Mudanças por Arquivo

### Main Process (backend)

#### `src/main/application/AgentService.ts` — Reescrever

**DE:** Classe com `execute()` que cria PTY por agente
**PARA:** Classe com gerenciamento de sessão persistente

```
Novo contrato:
- startSession(cwd: string): void          → cria PTY com `claude --allowedTools "..."`
- sendPrompt(agent, prompt): Promise<string> → escreve prompt, aguarda resposta, retorna output
- sendResponse(response): void              → escreve resposta do usuário no PTY
- cancelCurrentAgent(): void                → envia Ctrl+C
- endSession(): void                        → mata o PTY
- isSessionActive(): boolean
```

Estado interno:
- `activeSession: pty.IPty | null` — o único PTY
- `currentAgent: string | null` — qual agente está respondendo
- `responseBuffer: string` — acumula output do agente atual
- `responseResolver: ((output: string) => void) | null` — resolve a promise quando agente termina
- `agentTimeout: NodeJS.Timeout | null` — timeout do agente atual

#### `src/main/ipc/autopilot.ts` — Atualizar handlers

```
Novos IPC handlers:
- 'autopilot:startSession'  → agentService.startSession(cwd)
- 'autopilot:sendPrompt'    → agentService.sendPrompt(agent, prompt)
- 'autopilot:sendResponse'  → agentService.sendResponse(response)
- 'autopilot:cancel'        → agentService.cancelCurrentAgent()
- 'autopilot:endSession'    → agentService.endSession()

Manter eventos de streaming:
- 'autopilot:stream' → {agent, type, data} (sem mudança no renderer)
```

#### `src/main/domain/agents/constants.ts` — Sem mudança significativa

AGENT_SKILLS, DEFAULT_ALLOWED_TOOLS, AGENT_EXECUTION_TIMEOUT permanecem.

#### `src/main/domain/agents/QuestionDetector.ts` — Sem mudança

Mesma lógica de detecção de `[STATUS:]` markers.

### Preload (IPC bridge)

#### `src/preload/index.ts` — Atualizar API exposta

```typescript
// Substituir:
executeAgent → startSession + sendPrompt
respondToAgent → sendResponse

// Adicionar:
startAutopilotSession: (cwd: string) => Promise<void>
sendAgentPrompt: (agent: string, prompt: string) => Promise<string>
sendAgentResponse: (response: string) => Promise<void>
cancelCurrentAgent: () => Promise<void>
endAutopilotSession: () => Promise<void>

// Manter:
onAutopilotStream (sem mudança)
```

### Renderer (frontend)

#### `src/renderer/infrastructure/api/agentApi.ts` — Atualizar

```typescript
export const agentApi = {
  startSession: (cwd: string) => window.electronAPI.startAutopilotSession(cwd),
  sendPrompt: (agent: string, prompt: string) => window.electronAPI.sendAgentPrompt(agent, prompt),
  sendResponse: (response: string) => window.electronAPI.sendAgentResponse(response),
  cancel: () => window.electronAPI.cancelCurrentAgent(),
  endSession: () => window.electronAPI.endAutopilotSession(),
  onStream: (callback) => window.electronAPI.onAutopilotStream(callback),  // sem mudança
}
```

#### `src/renderer/domain/autopilot/PromptBuilder.ts` — Simplificar drasticamente

```
buildAgentPrompt:
  - Agente 1: "/agents:{agent} Analise esta spec:\n{specContent}"
  - Agentes 2+: "/agents:{agent} Continue baseado na análise anterior. Foque em:\n{focusPoints}"
  → NÃO inclui previousOutputs (já estão no contexto do CLI)
  → NÃO inclui specContent para agentes 2+ (já está no contexto)

buildContinuationPrompt:
  → ELIMINAR. Resposta do usuário é escrita diretamente no PTY.

formatPreviousOutputs:
  → ELIMINAR. Desnecessário.

formatUserResponseSeparator:
  → ELIMINAR. Desnecessário.
```

#### `src/renderer/domain/autopilot/AutopilotOrchestrator.ts` — Simplificar

Mudanças principais:
- `runPhases()`: chamar `agentApi.startSession()` no início, `agentApi.endSession()` no final
- Loop: `agentApi.sendPrompt(agent, prompt)` em vez de `agentApi.execute(agent, prompt, cwd)`
- Remover acúmulo de `previousOutputs` — desnecessário
- `continuePhase()`: chamar `agentApi.sendResponse(userResponse)` em vez de criar novo prompt
- Remover `combinedOutput` logic
- `runPhases` resolve naturalmente: o output de cada agente é o que o PTY retorna

#### `src/renderer/domain/autopilot/PhaseManager.ts` — Simplificar

- `collectPreviousOutputs()`: manter para compatibilidade do resume, mas não usado no fluxo normal
- Demais funções sem mudança

#### `src/renderer/lib/stores/autopilotStore.ts` — Ajustes mínimos

- `continuePhase()`: simplificar para apenas `agentApi.sendResponse(userResponse)` em vez de re-rodar o orchestrator
- Demais ações sem mudança estrutural

#### `src/renderer/components/organisms/AutopilotProgress/index.tsx` — Sem mudança

A UI não muda. Eventos `autopilot:stream` continuam iguais.

---

## Fluxo Completo (Novo)

```
1. Usuário clica "Start Autopilot" com [strategist, architect, builder]

2. Store: startRun() → status = 'running'

3. Orchestrator.startRun():
   a. agentApi.startSession(projectPath)
      → IPC: 'autopilot:startSession'
      → AgentService.startSession(cwd)
        → pty.spawn('bash', ['-c', 'claude --allowedTools "Edit,Write,Read,Glob,Grep,Bash"'])
        → Aguarda CLI estar pronto (detectar prompt)

   b. runPhases() loop:

   --- Agente 1: strategist ---
   c. prompt = "/agents:strategist Analise esta spec:\n{specContent}"
   d. output = agentApi.sendPrompt('strategist', prompt)
      → IPC: 'autopilot:sendPrompt'
      → AgentService.sendPrompt():
        → ptyProcess.write(prompt + '\n')
        → Aguarda resposta (idle detection + STATUS marker)
        → Stream output ao renderer via 'autopilot:stream'
        → Retorna output completo quando detecta fim
   e. Armazena phase.output = output
   f. STATUS = READY_TO_PROCEED → prosseguir

   --- Agente 2: architect ---
   g. prompt = "/agents:architect Projete a solução técnica baseado na análise anterior"
      (NÃO inclui spec nem output do strategist — já estão no contexto do CLI)
   h. output = agentApi.sendPrompt('architect', prompt)
   i. Armazena phase.output
   j. STATUS = AWAITING_INPUT → pausar

   --- Pergunta do agente ---
   k. Renderer mostra input field
   l. Usuário digita resposta
   m. agentApi.sendResponse(resposta)
      → IPC: 'autopilot:sendResponse'
      → AgentService: ptyProcess.write(resposta + '\n')
   n. Agente continua respondendo NA MESMA SESSÃO
   o. Aguarda novo STATUS marker
   p. STATUS = READY_TO_PROCEED → prosseguir

   --- Agente 3: builder ---
   q. prompt = "/agents:builder Implemente a solução"
   r. output = agentApi.sendPrompt('builder', prompt)
   s. Fim da run

4. agentApi.endSession()
   → AgentService: ptyProcess.kill()

5. Store: status = 'completed'
```

---

## Plano de Implementação (Ordem)

### Etapa 1: AgentService v2 (main process)
1. Criar `AgentSessionService` (ou reescrever `AgentService`) com o novo contrato
2. Implementar `startSession()`: spawn do PTY com `claude` interativo
3. Implementar detecção de "CLI pronto" (prompt detection)
4. Implementar `sendPrompt()`: write + aguardar resposta + retornar output
5. Implementar detecção de fim de resposta (idle + STATUS markers)
6. Implementar `sendResponse()`: write direto no PTY
7. Implementar `cancelCurrentAgent()`: Ctrl+C
8. Implementar `endSession()`: kill
9. Implementar timeout por agente

### Etapa 2: IPC + Preload
10. Registrar novos IPC handlers em `autopilot.ts`
11. Atualizar `preload/index.ts` com nova API
12. Manter backward compat: não remover handlers antigos ainda

### Etapa 3: Renderer API + PromptBuilder
13. Atualizar `agentApi.ts` com novos métodos
14. Simplificar `PromptBuilder.ts`: prompt leve para agentes 2+
15. Eliminar `buildContinuationPrompt`, `formatPreviousOutputs`

### Etapa 4: Orchestrator
16. Atualizar `AutopilotOrchestrator.ts`: startSession/endSession no início/fim
17. Simplificar loop: sendPrompt em vez de execute
18. Simplificar continuePhase: sendResponse em vez de novo PTY
19. Manter error handling e phase state transitions

### Etapa 5: Store + Testes
20. Ajustar `autopilotStore.ts` se necessário
21. Testar: run com 1 agente
22. Testar: run com 3 agentes sequenciais
23. Testar: pergunta + resposta do usuário
24. Testar: skip to next agent
25. Testar: cancel mid-run
26. Testar: timeout de agente individual
27. Testar: crash do PTY + resume

---

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Agente não emite STATUS marker | Baixa | Alto | PromptBuilder reforça instrução no prompt. Timeout de 15min + Ctrl+C como fallback. Atualizar skills .md |
| Falso positivo: marker detectado no meio do output (não no final) | Muito Baixa | Alto | Verificar apenas nos últimos 500 chars do buffer. Markers são frases específicas, improváveis em texto normal |
| Claude CLI não aceita `/agents:X` em modo interativo | Baixa | Crítico | Testar antes de implementar. Fallback: enviar conteúdo do .md diretamente |
| Context window enche com muitos agentes | Baixa | Médio | Claude CLI faz auto-compaction. Alertar se run > 4 agentes |
| PTY morre no meio da run | Baixa | Alto | onExit handler marca agentes como interrupted. Resume com novo PTY |
| Resposta do usuário enviada no momento errado | Baixa | Médio | Lock: só permitir sendResponse quando status = 'awaiting_input' |

---

## Verificação

1. `npm run build` sem erros
2. Testar start de sessão: `claude` abre e aceita input
3. Testar envio de `/agents:strategist` em modo interativo — verificar que skill é carregado
4. Testar detecção de fim de resposta com `[STATUS: READY_TO_PROCEED]`
5. Testar transição entre agentes: output do 1o influencia resposta do 2o
6. Testar pergunta: `[STATUS: AWAITING_INPUT]` → input do usuário → continuação
7. Testar cancel: Ctrl+C interrompe agente sem matar sessão
8. Testar timeout: agente que demora > 15min é cancelado
9. Testar crash recovery: matar processo → resume funciona
10. Comparar tokens: log do prompt.length antes/depois
