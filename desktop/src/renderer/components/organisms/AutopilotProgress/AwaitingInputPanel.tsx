import { MessageCircle, SkipForward, Loader2 } from 'lucide-react';
import type { PhaseResult } from '@/lib/stores/autopilotStore';

interface AwaitingInputPanelProps {
  phases: PhaseResult[];
  isSkipping: boolean;
  onExpandPhase: (index: number) => void;
  onSkipToNext: () => void;
}

export function AwaitingInputPanel({
  phases,
  isSkipping,
  onExpandPhase,
  onSkipToNext,
}: AwaitingInputPanelProps) {
  const handleViewQuestion = () => {
    // Find the last completed phase
    let lastCompletedIndex = -1;
    for (let i = phases.length - 1; i >= 0; i--) {
      if (phases[i].status === 'completed') {
        lastCompletedIndex = i;
        break;
      }
    }
    if (lastCompletedIndex >= 0) {
      onExpandPhase(lastCompletedIndex);
    }
  };

  return (
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
          onClick={handleViewQuestion}
          className="flex-1 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-3 h-3" />
          Ver pergunta e responder
        </button>
        <button
          onClick={onSkipToNext}
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
  );
}
