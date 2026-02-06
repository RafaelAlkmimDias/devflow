import { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Loader2,
  Sparkles,
  FileText,
  Cpu,
  ListTodo,
  CheckCircle2,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { agentApi, fileApi } from '@/infrastructure/api';
import { useSpecsStore } from '@/lib/stores/specsStore';

interface PlanningChatModalProps {
  projectPath: string;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  agent?: string;
  createdAt?: string;
}

type PlanningPhase = 'input' | 'analyzing' | 'executing' | 'completed';

interface DetectedIntent {
  type: 'story' | 'adr' | 'task' | 'unknown';
  agent: 'strategist' | 'architect' | null;
  confidence: number;
  reason: string;
}

/**
 * Analyzes user input to determine the best approach
 */
function detectIntent(input: string): DetectedIntent {
  const lowerInput = input.toLowerCase();

  // Keywords for user stories / features
  const storyKeywords = [
    'funcionalidade', 'feature', 'usuário', 'user', 'quero', 'preciso',
    'história', 'story', 'como usuário', 'as a user', 'requisito',
    'implementar', 'criar', 'adicionar', 'novo', 'nova'
  ];

  // Keywords for architecture decisions
  const adrKeywords = [
    'arquitetura', 'architecture', 'decisão', 'decision', 'tecnologia',
    'technology', 'banco de dados', 'database', 'framework', 'padrão',
    'pattern', 'estrutura', 'structure', 'design', 'api', 'integração'
  ];

  // Keywords for simple tasks
  const taskKeywords = [
    'bug', 'fix', 'corrigir', 'ajustar', 'atualizar', 'update',
    'remover', 'delete', 'pequeno', 'small', 'rápido', 'quick',
    'simples', 'simple', 'tarefa', 'task'
  ];

  const storyScore = storyKeywords.filter(k => lowerInput.includes(k)).length;
  const adrScore = adrKeywords.filter(k => lowerInput.includes(k)).length;
  const taskScore = taskKeywords.filter(k => lowerInput.includes(k)).length;

  // Check input length - very short inputs are likely simple tasks
  const isShortInput = input.length < 50;

  if (isShortInput && taskScore > 0) {
    return {
      type: 'task',
      agent: null,
      confidence: 0.7,
      reason: 'Tarefa simples detectada baseada em palavras-chave e tamanho do input'
    };
  }

  if (adrScore > storyScore && adrScore > 0) {
    return {
      type: 'adr',
      agent: 'architect',
      confidence: Math.min(0.9, 0.5 + adrScore * 0.1),
      reason: 'Decisão de arquitetura detectada - usando Architect agent'
    };
  }

  if (storyScore > 0 || input.length > 100) {
    return {
      type: 'story',
      agent: 'strategist',
      confidence: Math.min(0.9, 0.5 + storyScore * 0.1),
      reason: 'Requisito/funcionalidade detectada - usando Strategist agent'
    };
  }

  // Default to simple task for short, unclear inputs
  if (isShortInput) {
    return {
      type: 'task',
      agent: null,
      confidence: 0.5,
      reason: 'Input curto sem contexto claro - criando tarefa simples'
    };
  }

  // Default to strategist for longer, unclear inputs
  return {
    type: 'story',
    agent: 'strategist',
    confidence: 0.6,
    reason: 'Usando Strategist para analisar e estruturar o requisito'
  };
}

/**
 * Generate a simple task markdown content
 */
function generateSimpleTaskMarkdown(title: string, description: string): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const id = `TASK-${now.getTime().toString(36).toUpperCase()}`;

  return `---
id: ${id}
title: "${title}"
status: todo
priority: medium
created: ${dateStr}
type: task
---

# ${title}

## Descrição

${description}

## Tarefas

- [ ] ${title}

## Notas

Tarefa criada via Planning Chat em ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}.
`;
}

export function PlanningChatModal({ projectPath, onClose }: PlanningChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      type: 'system',
      content: 'Olá! Descreva o que você quer fazer e eu vou ajudar a planejar. Posso criar user stories, decisões de arquitetura (ADRs) ou tarefas simples.',
    },
  ]);
  const [input, setInput] = useState('');
  const [phase, setPhase] = useState<PlanningPhase>('input');
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
  const [createdItems, setCreatedItems] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { loadSpecs } = useSpecsStore();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const addMessage = (message: Omit<ChatMessage, 'id'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `msg-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage.id;
  };

  const handleSubmit = async () => {
    if (!input.trim() || phase === 'analyzing' || phase === 'executing') return;

    const userInput = input.trim();
    setInput('');

    // Add user message
    addMessage({ type: 'user', content: userInput });

    // Analyze intent
    setPhase('analyzing');
    const intent = detectIntent(userInput);

    // Add analysis message
    addMessage({
      type: 'system',
      content: `🔍 ${intent.reason} (confiança: ${Math.round(intent.confidence * 100)}%)`,
    });

    if (intent.agent) {
      // Execute agent
      setPhase('executing');
      setCurrentAgent(intent.agent);

      const agentIcon = intent.agent === 'strategist' ? '📊' : '🏗️';
      const agentName = intent.agent === 'strategist' ? 'Strategist' : 'Architect';

      addMessage({
        type: 'system',
        content: `${agentIcon} Chamando @${agentName} para processar sua solicitação...`,
      });

      try {
        const promptType = intent.type === 'unknown' ? 'story' : intent.type;
        const prompt = buildPlanningPrompt(promptType, userInput, projectPath);
        const output = await agentApi.execute(intent.agent, prompt, projectPath);

        // Add agent response
        addMessage({
          type: 'assistant',
          content: output || 'Processamento concluído.',
          agent: intent.agent,
        });

        setCreatedItems(prev => [...prev, promptType === 'story' ? 'User Story' : 'ADR']);
        setPhase('completed');

        // Refresh specs
        loadSpecs(projectPath);

        // Add follow-up message
        addMessage({
          type: 'system',
          content: '✅ Concluído! Deseja planejar mais alguma coisa?',
        });

      } catch (error) {
        console.error('Agent execution failed:', error);
        addMessage({
          type: 'system',
          content: `❌ Erro ao executar agente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        });
        setPhase('input');
      }

      setCurrentAgent(null);
    } else {
      // Create simple task
      setPhase('executing');

      addMessage({
        type: 'system',
        content: '📝 Criando tarefa simples...',
      });

      try {
        const title = extractTitle(userInput);
        const markdown = generateSimpleTaskMarkdown(title, userInput);

        // Create task file via IPC
        const fileName = `TASK-${Date.now().toString(36).toUpperCase()}.md`;
        const filePath = `docs/planning/stories/${fileName}`;

        // Ensure directory exists
        try {
          await fileApi.create(`${projectPath}/docs/planning/stories`, true);
        } catch {
          // Directory might already exist
        }

        await fileApi.write(`${projectPath}/${filePath}`, markdown);

        addMessage({
          type: 'assistant',
          content: `Tarefa criada com sucesso!\n\n**Arquivo:** ${filePath}\n**Título:** ${title}\n\nA tarefa foi documentada e está pronta para ser executada.`,
        });

        setCreatedItems(prev => [...prev, 'Task']);
        setPhase('completed');

        // Refresh specs
        loadSpecs(projectPath);

        addMessage({
          type: 'system',
          content: '✅ Concluído! Deseja planejar mais alguma coisa?',
        });

      } catch (error) {
        console.error('Failed to create task:', error);
        addMessage({
          type: 'system',
          content: `❌ Erro ao criar tarefa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        });
        setPhase('input');
      }
    }

    setPhase('input');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isProcessing = phase === 'analyzing' || phase === 'executing';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl bg-[#12121a] border border-white/10 rounded-xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 gradient-header-purple flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Planning Chat</h3>
              <p className="text-xs text-gray-400">Descreva o que você quer fazer</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {createdItems.length > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full">
                <CheckCircle2 className="w-3 h-3 text-green-400" />
                <span className="text-xs text-green-400">{createdItems.length} criado(s)</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {isProcessing && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>
                {phase === 'analyzing' ? 'Analisando...' : `@${currentAgent} processando...`}
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-white/10 flex-shrink-0">
          <div className="flex gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Descreva o que você quer criar ou fazer..."
              disabled={isProcessing}
              className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500/50 resize-none disabled:opacity-50"
              rows={2}
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || isProcessing}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 self-end"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Quick suggestions */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-xs text-gray-500">Sugestões:</span>
            {[
              { icon: <FileText className="w-3 h-3" />, label: 'User Story', prompt: 'Quero criar uma funcionalidade para ' },
              { icon: <Cpu className="w-3 h-3" />, label: 'ADR', prompt: 'Preciso decidir sobre a arquitetura de ' },
              { icon: <ListTodo className="w-3 h-3" />, label: 'Task', prompt: 'Tarefa: ' },
            ].map((suggestion) => (
              <button
                key={suggestion.label}
                onClick={() => setInput(suggestion.prompt)}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              >
                {suggestion.icon}
                {suggestion.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Message bubble component
 */
function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.type === 'system') {
    return (
      <div className="flex justify-center">
        <div className="px-3 py-2 bg-white/5 rounded-lg text-xs text-gray-400 max-w-md text-center">
          {message.content}
        </div>
      </div>
    );
  }

  const isUser = message.type === 'user';

  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-lg',
          isUser
            ? 'bg-gradient-to-br from-blue-500/30 to-blue-600/20 text-blue-300 ring-2 ring-blue-500/30'
            : 'bg-gradient-to-br from-purple-500/30 to-purple-600/20 text-purple-300 ring-2 ring-purple-500/30'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4" />
        ) : message.agent === 'strategist' ? (
          '📊'
        ) : message.agent === 'architect' ? (
          '🏗️'
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          'flex-1 max-w-[80%] rounded-xl px-4 py-3 shadow-md',
          isUser ? 'chat-bubble-user ml-auto' : 'chat-bubble-agent'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'text-[11px] font-semibold mb-2 flex items-center gap-2',
            isUser ? 'text-blue-300 justify-end' : 'text-purple-300'
          )}
        >
          {isUser ? (
            <>
              <span>Você</span>
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            </>
          ) : (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span>{message.agent ? `@${message.agent}` : 'Assistant'}</span>
            </>
          )}
        </div>

        {/* Content */}
        <pre
          className={cn(
            'text-[13px] whitespace-pre-wrap break-words font-sans leading-relaxed',
            isUser ? 'text-blue-100' : 'text-gray-200'
          )}
        >
          {message.content}
        </pre>
      </div>
    </div>
  );
}

/**
 * Build prompt for planning agents
 */
function buildPlanningPrompt(type: 'story' | 'adr' | 'task', userInput: string, projectPath: string): string {
  if (type === 'story') {
    return `Você é o Strategist agent. O usuário descreveu o seguinte requisito/funcionalidade:

"${userInput}"

Com base nessa descrição:
1. Analise o requisito e identifique se é uma feature nova, melhoria ou correção
2. Crie uma User Story estruturada no formato padrão (com título, descrição, critérios de aceitação)
3. Salve a user story em um arquivo markdown em docs/planning/stories/
4. Use o formato US-XXX.md para o nome do arquivo

O projeto está em: ${projectPath}

Seja conciso na resposta e confirme o que foi criado.`;
  }

  if (type === 'adr') {
    return `Você é o Architect agent. O usuário precisa tomar uma decisão de arquitetura sobre:

"${userInput}"

Com base nessa descrição:
1. Analise o contexto e as opções disponíveis
2. Crie um ADR (Architecture Decision Record) estruturado
3. Salve o ADR em um arquivo markdown em docs/decisions/
4. Use o formato ADR-XXX.md para o nome do arquivo

O projeto está em: ${projectPath}

Seja conciso na resposta e confirme o que foi criado.`;
  }

  return userInput;
}

/**
 * Extract a title from user input
 */
function extractTitle(input: string): string {
  // Take first line or first 50 chars
  const firstLine = input.split('\n')[0];
  const title = firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
  return title.replace(/^(tarefa:|task:|fazer:|todo:)\s*/i, '').trim();
}
