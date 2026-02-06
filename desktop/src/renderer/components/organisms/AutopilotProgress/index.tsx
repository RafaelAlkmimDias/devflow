import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useAutopilotStore } from '@/lib/stores/autopilotStore';
import { agentApi, notificationApi } from '@/infrastructure/api';
import type { AutopilotStreamData } from '@shared/types';
import { AutopilotHeader } from './AutopilotHeader';
import { AutopilotFooter } from './AutopilotFooter';
import { PhaseItem } from './PhaseItem';
import { MessageCircle, Send, Loader2, SkipForward } from 'lucide-react';

export function AutopilotProgress() {
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

  const [startTime, setStartTime] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [waitingForResponse, setWaitingForResponse] = useState(false);
  const [responseInput, setResponseInput] = useState('');
  const [isStartingNext, setIsStartingNext] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Listen to autopilot stream
  useEffect(() => {
    const unsubscribe = agentApi.onStream((data: AutopilotStreamData) => {
      if (data.type === 'start') {
        setWaitingForResponse(false);
      } else if (data.type === 'question' && data.data) {
        setWaitingForResponse(true);
        // Notify user that agent has a question
        const agentName = data.agent || 'Agente';
        notificationApi.notifyQuestion(agentName);
      } else if (data.type === 'response-sent') {
        setWaitingForResponse(false);
        setResponseInput('');
      }
    });

    return () => unsubscribe();
  }, []);

  // Send notifications when autopilot status changes
  useEffect(() => {
    const currentAgent = currentPhaseIndex >= 0 && phases[currentPhaseIndex]
      ? phases[currentPhaseIndex].agent
      : 'Agente';

    if (status === 'completed') {
      notificationApi.notifyCompleted();
    } else if (status === 'failed') {
      notificationApi.notifyFailed(error || undefined);
    } else if (status === 'awaiting_input') {
      notificationApi.notifyAwaitingInput(currentAgent);
    }
  }, [status, error, currentPhaseIndex, phases]);

  // Handle sending response - use continuePhase to re-run agent with user's response
  const handleSendResponse = async () => {
    if (!responseInput.trim() || currentPhaseIndex < 0) return;

    try {
      setWaitingForResponse(false);
      const response = responseInput.trim();
      setResponseInput('');
      await continuePhase(currentPhaseIndex, response);
    } catch (err) {
      console.error('Failed to continue phase:', err);
      setWaitingForResponse(true); // Restore state on error
    }
  };

  // Focus input and expand current phase when waiting for response
  useEffect(() => {
    if (waitingForResponse) {
      if (inputRef.current) {
        inputRef.current.focus();
      }
      // Auto-expand current phase so user can see the agent's question
      if (currentPhaseIndex >= 0) {
        setExpandedPhase(currentPhaseIndex);
      }
    }
  }, [waitingForResponse, currentPhaseIndex]);

  // Handle Enter key in response input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendResponse();
    }
  };

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

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    const secs = Math.floor(ms / 1000);
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    const remainSecs = secs % 60;
    return `${mins}m ${remainSecs}s`;
  };

  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';
  const isInterrupted = status === 'interrupted';
  const isAwaitingInput = status === 'awaiting_input';
  const canResume = isInterrupted || isFailed;
  const isDone = isCompleted || isFailed || isInterrupted;

  const nextAgent = typeof getNextAgent === 'function' ? getNextAgent() : null;
  const canContinueToNext = isCompleted && nextAgent !== null;

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

  const handleMinimize = () => {
    if (isMinimized) {
      setIsMinimized(false);
    } else {
      setIsMinimized(true);
      setIsMaximized(false);
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
      <AutopilotHeader
        status={status}
        completedPhases={completedPhases}
        totalPhases={phases.length}
        progress={progress}
        isMinimized={isMinimized}
        isMaximized={isMaximized}
        canResume={canResume}
        canContinueToNext={canContinueToNext}
        nextAgent={nextAgent}
        isAwaitingInput={isAwaitingInput}
        isDone={isDone}
        isStartingNext={isStartingNext}
        isSkipping={isSkipping}
        onMinimize={handleMinimize}
        onMaximize={() => setIsMaximized(!isMaximized)}
        onResume={() => resumeRun()}
        onRunNextAgent={handleRunNextAgent}
        onSkipToNext={handleSkipToNext}
        onReset={reset}
      />

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
          {phases.map((phase, index) => (
            <PhaseItem
              key={`${phase.agent}-${index}`}
              phase={phase}
              phaseIndex={index}
              isCurrent={index === currentPhaseIndex}
              isExpanded={expandedPhase === index}
              onToggle={() => setExpandedPhase(expandedPhase === index ? null : index)}
              isMaximized={isMaximized}
              shouldFillSpace={isMaximized && expandedPhase === index}
              formatDuration={formatDuration}
              onContinue={continuePhase}
              isRunning={status === 'running'}
            />
          ))}
        </div>
      )}

      {/* Response Input - shown when agent asks a question or awaiting input */}
      {(waitingForResponse || isAwaitingInput) && !isMinimized && (
        <div className="px-3 py-3 bg-amber-500/10 border-t border-amber-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-amber-400 font-medium">
                {waitingForResponse ? 'Agente aguardando sua resposta' : 'Agente terminou com pendência'}
              </span>
            </div>
            {isAwaitingInput && !waitingForResponse && (
              <button
                onClick={handleSkipToNext}
                disabled={isSkipping}
                className="flex items-center gap-1 px-2 py-1 text-[10px] text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors disabled:opacity-50"
              >
                {isSkipping ? <Loader2 className="w-3 h-3 animate-spin" /> : <SkipForward className="w-3 h-3" />}
                Pular
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={responseInput}
              onChange={(e) => setResponseInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua resposta e pressione Enter..."
              className="flex-1 px-3 py-2 bg-black/40 border border-amber-500/30 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
            />
            <button
              onClick={handleSendResponse}
              disabled={!responseInput.trim()}
              className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Enviar resposta"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Footer Stats - hidden when minimized */}
      {!isMinimized && (
        <AutopilotFooter
          elapsed={elapsed}
          completedPhases={completedPhases}
          totalPhases={phases.length}
          progress={progress}
          isCompleted={isCompleted}
          isFailed={isFailed}
        />
      )}
    </div>
  );
}

// Re-export for backwards compatibility
export { AutopilotProgress as AutopilotPanel };
