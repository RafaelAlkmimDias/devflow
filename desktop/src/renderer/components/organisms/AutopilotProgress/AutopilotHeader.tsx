import {
  Zap,
  ChevronDown,
  ChevronUp,
  X,
  Maximize2,
  Minimize2,
  SkipForward,
  Play,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEFAULT_PHASES } from '@/lib/stores/autopilotStore';
import type { AgentId } from '@/lib/stores/autopilotStore';

interface AutopilotHeaderProps {
  status: string;
  completedPhases: number;
  totalPhases: number;
  progress: number;
  isMinimized: boolean;
  isMaximized: boolean;
  canResume: boolean;
  canContinueToNext: boolean;
  nextAgent: AgentId | null;
  isAwaitingInput: boolean;
  isDone: boolean;
  isStartingNext: boolean;
  isSkipping: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  onResume: () => void;
  onRunNextAgent: () => void;
  onSkipToNext: () => void;
  onReset: () => void;
}

export function AutopilotHeader({
  status,
  completedPhases,
  totalPhases,
  progress,
  isMinimized,
  isMaximized,
  canResume,
  canContinueToNext,
  nextAgent,
  isAwaitingInput,
  isDone,
  isStartingNext,
  isSkipping,
  onMinimize,
  onMaximize,
  onResume,
  onRunNextAgent,
  onSkipToNext,
  onReset,
}: AutopilotHeaderProps) {
  const isRunning = status === 'running';
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';
  const isInterrupted = status === 'interrupted';

  const nextAgentInfo = nextAgent ? DEFAULT_PHASES.find(p => p.id === nextAgent) : null;

  return (
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
            <span className="text-xs text-gray-400">{completedPhases}/{totalPhases}</span>
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
            onClick={onSkipToNext}
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
            onClick={onRunNextAgent}
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
            onClick={onResume}
            className="px-2 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs rounded-lg transition-colors flex items-center gap-1"
            title="Resume from where it stopped"
          >
            <Play className="w-3 h-3" />
            Resume
          </button>
        )}
        {/* Minimize/Expand button */}
        <button
          onClick={onMinimize}
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
            onClick={onMaximize}
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
            onClick={onReset}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
