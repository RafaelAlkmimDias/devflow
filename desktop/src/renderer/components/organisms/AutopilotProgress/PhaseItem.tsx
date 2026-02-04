import { useState, useRef } from 'react';
import {
  CheckCircle2,
  Circle,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  SkipForward,
  MessageCircle,
  Send,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PhaseResult } from '@/lib/stores/autopilotStore';
import { AGENT_INFO } from './types';
import { ChatOutput } from './ChatOutput';

interface PhaseItemProps {
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
}

export function PhaseItem({
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
}: PhaseItemProps) {
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
          <ChatOutput
            output={phase.output || ''}
            agentId={phase.agent}
            isMaximized={isMaximized}
            shouldFillSpace={shouldFillSpace}
          />

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
