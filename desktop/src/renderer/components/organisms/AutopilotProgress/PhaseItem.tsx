import { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  SkipForward,
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
  onContinue?: (phaseIndex: number, userResponse: string) => Promise<void>;
  isRunning: boolean;
}

export function PhaseItem({
  phase,
  phaseIndex: _phaseIndex,
  isCurrent,
  isExpanded,
  onToggle,
  isMaximized,
  shouldFillSpace,
  formatDuration,
  isRunning: _isRunning,
}: PhaseItemProps) {
  const agent = AGENT_INFO[phase.agent];
  const [copied, setCopied] = useState(false);

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

  const hasOutput = phase.output && phase.output.length > 0;

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
        'border-b border-white/5 last:border-0 transition-all duration-300',
        isCurrent && phase.status === 'running' && 'bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-transparent border-l-2 border-l-purple-500',
        phase.status === 'completed' && 'bg-gradient-to-r from-green-500/5 to-transparent',
        shouldFillSpace && 'flex-1 flex flex-col min-h-0'
      )}
    >
      <button
        onClick={onToggle}
        className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-all duration-200"
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
          <ChatOutput
            output={phase.output || ''}
            agentId={phase.agent}
            isMaximized={isMaximized}
            shouldFillSpace={shouldFillSpace}
          />
        </div>
      )}
    </div>
  );
}
