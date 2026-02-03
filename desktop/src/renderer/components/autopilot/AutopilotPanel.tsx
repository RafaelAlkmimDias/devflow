import { useEffect, useState, useRef } from 'react';
import {
  CheckCircle2,
  Circle,
  Loader2,
  AlertCircle,
  Clock,
  Zap,
  ChevronDown,
  ChevronUp,
  X,
  Maximize2,
  Minimize2,
  SkipForward,
  Terminal,
  Play,
  MessageCircle,
  Send,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useAutopilotStore,
  DEFAULT_PHASES,
  type PhaseResult,
  type AgentId,
} from '@/lib/stores/autopilotStore';
import { api, type AutopilotStreamData } from '@/api';

const AGENT_INFO: Record<AgentId, { icon: string; color: string; name: string }> = {
  strategist: { icon: '📊', color: 'text-blue-400', name: 'Strategist' },
  architect: { icon: '🏗️', color: 'text-purple-400', name: 'Architect' },
  builder: { icon: '🔨', color: 'text-amber-400', name: 'Builder' },
  guardian: { icon: '🛡️', color: 'text-green-400', name: 'Guardian' },
  chronicler: { icon: '📝', color: 'text-pink-400', name: 'Chronicler' },
};

export function AutopilotPanel() {
  const store = useAutopilotStore();

  // Defensive: ensure all required properties exist
  const status = store.status ?? 'idle';
  const phases = store.phases ?? [];
  const specTitle = store.specTitle ?? '';
  const error = store.error;
  const reset = store.reset;
  const resumeRun = store.resumeRun;
  const continuePhase = store.continuePhase;
  const runNextAgent = store.runNextAgent;
  const getNextAgent = store.getNextAgent;
  const skipToNextAgent = store.skipToNextAgent;
  const currentPhaseIndex = store.currentPhaseIndex ?? -1;
  const liveLog = store.liveLog ?? '';
  const appendLog = store.appendLog;
  const clearLog = store.clearLog;
  const [startTime, setStartTime] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showLiveLog, setShowLiveLog] = useState(true);
  const [waitingForResponse, setWaitingForResponse] = useState(false);
  const [responseInput, setResponseInput] = useState('');
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Copy live log to clipboard
  const handleCopyLog = async () => {
    if (!liveLog) return;
    try {
      await navigator.clipboard.writeText(liveLog);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Listen to autopilot stream
  useEffect(() => {
    const unsubscribe = api.onAutopilotStream((data: AutopilotStreamData) => {
      if (data.type === 'start') {
        clearLog();
        setWaitingForResponse(false);
        setCurrentAgent(data.agent || null);
      } else if (data.type === 'stdout' && data.data) {
        appendLog(data.data);
      } else if (data.type === 'stderr' && data.data) {
        appendLog(`[stderr] ${data.data}`);
      } else if (data.type === 'question' && data.data) {
        // Agent is asking a question
        setWaitingForResponse(true);
        setCurrentAgent(data.agent || null);
        appendLog('\n--- Aguardando resposta ---\n');
      } else if (data.type === 'response-sent') {
        // Response was sent, resume streaming
        setWaitingForResponse(false);
        setResponseInput('');
        appendLog(`\n[Sua resposta: ${data.data}]\n`);
      }
    });

    return () => unsubscribe();
  }, [appendLog, clearLog]);

  // Focus input when waiting for response
  useEffect(() => {
    if (waitingForResponse && inputRef.current) {
      inputRef.current.focus();
    }
  }, [waitingForResponse]);

  // Handle sending response
  const handleSendResponse = async () => {
    if (!responseInput.trim() || !currentAgent) return;

    try {
      await api.respondToAgent(currentAgent, responseInput.trim());
    } catch (err) {
      console.error('Failed to send response:', err);
      appendLog(`\n[Erro ao enviar resposta: ${err}]\n`);
    }
  };

  // Handle Enter key in input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendResponse();
    }
  };

  // Auto-scroll log to bottom
  useEffect(() => {
    if (logEndRef.current && showLiveLog) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveLog, showLiveLog]);

  // Reset timer when a new run starts
  useEffect(() => {
    if (status === 'running' && currentPhaseIndex === 0) {
      setStartTime(Date.now());
      setElapsed(0);
    }
  }, [status, currentPhaseIndex]);

  // Update elapsed time
  useEffect(() => {
    if (status !== 'running') return;

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [status, startTime]);

  // Don't show if idle
  if (status === 'idle' || phases.length === 0) return null;

  const completedPhases = phases.filter((p) => p.status === 'completed').length;
  const progress = phases.length > 0 ? Math.round((completedPhases / phases.length) * 100) : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    const secs = Math.floor(ms / 1000);
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    const remainSecs = secs % 60;
    return `${mins}m ${remainSecs}s`;
  };

  const isRunning = status === 'running';
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';
  const isInterrupted = status === 'interrupted';
  const isAwaitingInput = status === 'awaiting_input';
  const canResume = isInterrupted || isFailed;
  const isDone = isCompleted || isFailed || isInterrupted;

  // Check if there's a next agent to run
  const nextAgent = typeof getNextAgent === 'function' ? getNextAgent() : null;
  const nextAgentInfo = nextAgent ? DEFAULT_PHASES.find(p => p.id === nextAgent) : null;
  const canContinueToNext = isCompleted && nextAgent !== null;

  // Handle running next agent
  const [isStartingNext, setIsStartingNext] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  const handleRunNextAgent = async () => {
    if (!canContinueToNext || isStartingNext) return;
    setIsStartingNext(true);
    try {
      await runNextAgent();
    } catch (err) {
      console.error('Failed to run next agent:', err);
    } finally {
      setIsStartingNext(false);
    }
  };

  // Handle skipping question and continuing to next agent
  const handleSkipToNext = async () => {
    if (!isAwaitingInput || isSkipping) return;
    setIsSkipping(true);
    try {
      await skipToNextAgent();
    } catch (err) {
      console.error('Failed to skip to next agent:', err);
    } finally {
      setIsSkipping(false);
    }
  };

  return (
    <div
      className={cn(
        'fixed bg-[#12121a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 transition-all duration-300 flex flex-col',
        isMaximized
          ? 'top-4 bottom-4 right-4 w-[600px]'
          : 'bottom-4 right-4',
        !isMaximized && (isMinimized ? 'w-auto min-w-[320px]' : 'w-[480px]')
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-purple-400" />
          <span className="font-semibold text-white text-sm">Autopilot</span>
          {isRunning && (
            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full animate-pulse">
              Running
            </span>
          )}
          {isCompleted && (
            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
              Complete
            </span>
          )}
          {isFailed && (
            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
              Failed
            </span>
          )}
          {isInterrupted && (
            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
              Interrupted
            </span>
          )}
          {isAwaitingInput && (
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full animate-pulse">
              Aguardando resposta
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Minimized: show progress inline */}
          {isMinimized && (
            <div className="flex items-center gap-2 mr-2">
              <span className="text-xs text-gray-400">{completedPhases}/{phases.length}</span>
              <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    isCompleted ? 'bg-green-500' : isFailed ? 'bg-red-500' : 'bg-purple-500'
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-purple-400 font-medium">{progress}%</span>
            </div>
          )}
          {/* Skip to next agent when awaiting input */}
          {isAwaitingInput && !isMinimized && (
            <button
              onClick={handleSkipToNext}
              disabled={isSkipping}
              className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
              title="Pular pergunta e continuar para próximo agente"
            >
              {isSkipping ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <SkipForward className="w-3 h-3" />
              )}
              Pular
            </button>
          )}
          {canContinueToNext && !isMinimized && (
            <button
              onClick={handleRunNextAgent}
              disabled={isStartingNext}
              className="px-2 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-xs rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
              title={`Continuar para ${nextAgentInfo?.name || nextAgent}`}
            >
              {isStartingNext ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Play className="w-3 h-3" />
              )}
              {nextAgentInfo?.name || nextAgent}
            </button>
          )}
          {canResume && !isMinimized && (
            <button
              onClick={() => resumeRun()}
              className="px-2 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs rounded-lg transition-colors flex items-center gap-1"
              title="Resume from where it stopped"
            >
              <Play className="w-3 h-3" />
              Resume
            </button>
          )}
          {/* Minimize/Expand button */}
          <button
            onClick={() => {
              if (isMinimized) {
                setIsMinimized(false);
              } else {
                setIsMinimized(true);
                setIsMaximized(false);
              }
            }}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
            title={isMinimized ? 'Expandir' : 'Minimizar'}
          >
            {isMinimized ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {/* Maximize button - only show when not minimized */}
          {!isMinimized && (
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
              title={isMaximized ? 'Restaurar' : 'Maximizar'}
            >
              {isMaximized ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          )}
          {isDone && (
            <button
              onClick={reset}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Spec Title - hidden when minimized */}
      {!isMinimized && (
        <div className="px-4 py-2 border-b border-white/5">
          <p className="text-xs text-gray-400 truncate">{specTitle}</p>
        </div>
      )}

      {/* Error message - always show if there's an error */}
      {error && !isMinimized && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Phases - hidden when minimized */}
      {!isMinimized && (
        <div className={cn('overflow-y-auto flex flex-col', isMaximized ? 'flex-1' : 'max-h-40')}>
          {phases.map((phase, index) => {
            const isPhaseExpanded = expandedPhase === index;

            const handleToggle = () => {
              setExpandedPhase(expandedPhase === index ? null : index);
            };

            return (
              <PhaseItem
                key={`${phase.agent}-${index}`}
                phase={phase}
                phaseIndex={index}
                isCurrent={index === currentPhaseIndex}
                isExpanded={isPhaseExpanded}
                onToggle={handleToggle}
                isMaximized={isMaximized}
                shouldFillSpace={isMaximized && isPhaseExpanded}
                formatDuration={formatDuration}
                onContinue={continuePhase}
                isRunning={status === 'running'}
              />
            );
          })}
        </div>
      )}

      {/* Live Log - hidden when minimized */}
      {isRunning && !isMinimized && (
        <div className={cn(
          'border-t border-white/10',
          isMaximized && !showLiveLog && 'border-b'
        )}>
          <div className="px-4 py-2 flex items-center justify-between bg-black/20">
            <button
              onClick={() => setShowLiveLog(!showLiveLog)}
              className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors"
            >
              <Terminal className="w-3 h-3" />
              <span>Live Output</span>
              {liveLog.length > 0 && (
                <span className="text-gray-500">({Math.round(liveLog.length / 1024)}KB)</span>
              )}
            </button>
            <div className="flex items-center gap-1">
              {liveLog.length > 0 && (
                <button
                  onClick={handleCopyLog}
                  className="p-1 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-white"
                  title={copied ? 'Copiado!' : 'Copiar output'}
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
              <button
                onClick={() => setShowLiveLog(!showLiveLog)}
                className="p-1 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-white"
                title={showLiveLog ? 'Minimizar output' : 'Expandir output'}
              >
                {showLiveLog ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          {showLiveLog && (
            <div className={cn(
              'bg-black/40 overflow-y-auto font-mono text-xs',
              isMaximized ? 'flex-1 max-h-[400px]' : 'max-h-32'
            )}>
              <pre className="p-3 text-gray-300 whitespace-pre-wrap break-all">
                {liveLog || 'Waiting for output...'}
                <div ref={logEndRef} />
              </pre>
            </div>
          )}

          {/* Response Input - shown when agent asks a question */}
          {waitingForResponse && (
            <div className="px-3 py-2 bg-yellow-500/10 border-t border-yellow-500/20">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="w-4 h-4 text-yellow-400" />
                <span className="text-xs text-yellow-400 font-medium">Agent is waiting for your response</span>
              </div>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={responseInput}
                  onChange={(e) => setResponseInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your response and press Enter..."
                  className="flex-1 px-3 py-2 bg-black/40 border border-yellow-500/30 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50"
                />
                <button
                  onClick={handleSendResponse}
                  disabled={!responseInput.trim()}
                  className="px-3 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Send response"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Awaiting Input - show when paused for question */}
      {isAwaitingInput && !isMinimized && (
        <div className="px-4 py-3 bg-amber-500/10 border-t border-amber-500/20">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-amber-400 font-medium">
              O agente terminou com uma pergunta. Você pode responder ou pular para o próximo agente.
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            Expanda o output acima para ver a pergunta e use o botão "Responder" para continuar a conversa, ou clique em "Pular" no cabeçalho para ir ao próximo agente.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                // Expand the last completed phase to show the response input
                // Find the last completed phase by iterating backwards
                let lastCompletedIndex = -1;
                for (let i = phases.length - 1; i >= 0; i--) {
                  if (phases[i].status === 'completed') {
                    lastCompletedIndex = i;
                    break;
                  }
                }
                if (lastCompletedIndex >= 0) {
                  setExpandedPhase(lastCompletedIndex);
                }
              }}
              className="flex-1 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-3 h-3" />
              Ver pergunta e responder
            </button>
            <button
              onClick={handleSkipToNext}
              disabled={isSkipping}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-gray-300 text-xs rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isSkipping ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <SkipForward className="w-3 h-3" />
              )}
              Pular para próximo
            </button>
          </div>
        </div>
      )}

      {/* Footer Stats - hidden when minimized */}
      {!isMinimized && (
        <div className="px-4 py-3 border-t border-white/10 bg-white/5">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(elapsed)}
              </span>
              <span>
                {completedPhases}/{phases.length} phases
              </span>
            </div>
            <span className="text-purple-400 font-medium">{progress}%</span>
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                isCompleted ? 'bg-green-500' : isFailed ? 'bg-red-500' : 'bg-purple-500'
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PhaseItem({
  phase,
  phaseIndex,
  isCurrent,
  isExpanded,
  onToggle,
  isMaximized,
  shouldFillSpace,
  formatDuration,
  onContinue,
  isRunning,
}: {
  phase: PhaseResult;
  phaseIndex: number;
  isCurrent: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  isMaximized?: boolean;
  shouldFillSpace?: boolean;
  formatDuration: (ms?: number) => string;
  onContinue: (phaseIndex: number, userResponse: string) => Promise<void>;
  isRunning: boolean;
}) {
  const agent = AGENT_INFO[phase.agent];
  const [copied, setCopied] = useState(false);
  const [showResponseInput, setShowResponseInput] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const responseInputRef = useRef<HTMLTextAreaElement>(null);

  const handleCopyOutput = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!phase.output) return;
    try {
      await navigator.clipboard.writeText(phase.output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleToggleResponse = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowResponseInput(!showResponseInput);
    if (!showResponseInput) {
      setTimeout(() => responseInputRef.current?.focus(), 100);
    }
  };

  const handleSendContinuation = async () => {
    if (!responseText.trim() || isSending) return;
    setIsSending(true);
    try {
      await onContinue(phaseIndex, responseText.trim());
      setResponseText('');
      setShowResponseInput(false);
    } catch (err) {
      console.error('Failed to continue phase:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSendContinuation();
    }
  };

  const hasOutput = phase.output && phase.output.length > 0;
  const canRespond = phase.status === 'completed' && hasOutput && !isRunning;

  const getStatusIcon = () => {
    switch (phase.status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'skipped':
        return <SkipForward className="w-4 h-4 text-gray-500" />;
      default:
        return <Circle className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div
      className={cn(
        'border-b border-white/5 last:border-0',
        isCurrent && phase.status === 'running' && 'bg-purple-500/5',
        shouldFillSpace && 'flex-1 flex flex-col min-h-0'
      )}
    >
      <button
        onClick={onToggle}
        className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors"
        disabled={!hasOutput}
      >
        {getStatusIcon()}
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className={cn('text-sm font-medium', agent.color)}>
              {agent.icon} {phase.name}
            </span>
            <span className="text-xs text-gray-500">@{phase.agent}</span>
            {phase.duration && (
              <span className="text-xs text-gray-600">{formatDuration(phase.duration)}</span>
            )}
          </div>
          {phase.status === 'running' && (
            <p className="text-xs text-gray-500 mt-0.5">Processing...</p>
          )}
          {phase.error && <p className="text-xs text-red-400 mt-0.5 truncate">{phase.error}</p>}
        </div>
        {hasOutput && (
          <div className="text-gray-500">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        )}
      </button>

      {/* Expanded output */}
      {isExpanded && hasOutput && (
        <div className={cn(
          "px-4 py-3 bg-black/20 border-t border-white/5",
          shouldFillSpace && "flex-1 flex flex-col min-h-0 overflow-hidden"
        )}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Output</span>
            <div className="flex items-center gap-2">
              {canRespond && (
                <button
                  onClick={handleToggleResponse}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 text-[10px] rounded transition-colors",
                    showResponseInput
                      ? "bg-purple-500/20 text-purple-400"
                      : "text-gray-400 hover:text-white hover:bg-white/10"
                  )}
                  title="Responder ao agente"
                >
                  <MessageCircle className="w-3 h-3" />
                  <span>Responder</span>
                </button>
              )}
              <button
                onClick={handleCopyOutput}
                className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                title={copied ? 'Copiado!' : 'Copiar output'}
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-green-400" />
                    <span className="text-green-400">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
          </div>
          <pre
            className={cn(
              'text-xs text-gray-400 whitespace-pre-wrap overflow-y-auto font-mono',
              shouldFillSpace ? 'flex-1 min-h-0' : (isMaximized ? 'max-h-[300px]' : 'max-h-40')
            )}
          >
            {phase.output}
          </pre>

          {/* Response input for continuing conversation */}
          {showResponseInput && canRespond && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-purple-400 font-medium">Continuar conversa com o agente</span>
              </div>
              <textarea
                ref={responseInputRef}
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite sua resposta... (Cmd/Ctrl + Enter para enviar)"
                className="w-full px-3 py-2 bg-black/40 border border-purple-500/30 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 resize-none"
                rows={3}
                disabled={isSending}
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => {
                    setShowResponseInput(false);
                    setResponseText('');
                  }}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                  disabled={isSending}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSendContinuation}
                  disabled={!responseText.trim() || isSending}
                  className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-xs rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-3 h-3" />
                      Enviar
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
