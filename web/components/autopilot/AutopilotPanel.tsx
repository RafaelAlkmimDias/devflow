'use client';

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
  Copy,
  Check,
  MessageCircle,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useAutopilotStore,
  type PhaseResult,
  type AgentId,
} from '@/lib/stores/autopilotStore';

const AGENT_INFO: Record<AgentId, { icon: string; color: string; name: string }> = {
  strategist: { icon: '📊', color: 'text-blue-400', name: 'Strategist' },
  architect: { icon: '🏗️', color: 'text-purple-400', name: 'Architect' },
  builder: { icon: '🔨', color: 'text-amber-400', name: 'Builder' },
  guardian: { icon: '🛡️', color: 'text-green-400', name: 'Guardian' },
  chronicler: { icon: '📝', color: 'text-pink-400', name: 'Chronicler' },
};

export function AutopilotPanel() {
  const { status, phases, specTitle, error, reset, continuePhase, currentPhaseIndex } = useAutopilotStore();
  const [startTime, setStartTime] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

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
  const progress = Math.round((completedPhases / phases.length) * 100);

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
  const isDone = isCompleted || isFailed;

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

      {/* Error message - hidden when minimized */}
      {error && !isMinimized && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Phases - hidden when minimized */}
      {!isMinimized && (
        <div className={cn('overflow-y-auto', isMaximized ? 'flex-1' : 'max-h-80')}>
          {phases.map((phase, index) => (
            <PhaseItem
              key={`${phase.agent}-${index}`}
              phase={phase}
              phaseIndex={index}
              isCurrent={index === currentPhaseIndex}
              isExpanded={expandedPhase === index || isMaximized}
              onToggle={() => setExpandedPhase(expandedPhase === index ? null : index)}
              isMaximized={isMaximized}
              formatDuration={formatDuration}
              onContinue={continuePhase}
              isRunning={status === 'running'}
            />
          ))}
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

  const hasOutput = phase.output && phase.output.length > 0;
  const canRespond = phase.status === 'completed' && hasOutput && !isRunning;

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
        isCurrent && phase.status === 'running' && 'bg-purple-500/5'
      )}
    >
      <button
        onClick={onToggle}
        className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors"
        disabled={!hasOutput && !isMaximized}
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
        {hasOutput && !isMaximized && (
          <div className="text-gray-500">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        )}
      </button>

      {/* Expanded output */}
      {isExpanded && hasOutput && (
        <div className="px-4 py-3 bg-black/20 border-t border-white/5">
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
              isMaximized ? 'max-h-[300px]' : 'max-h-40'
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
