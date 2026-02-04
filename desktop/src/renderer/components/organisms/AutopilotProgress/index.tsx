import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useAutopilotStore } from '@/lib/stores/autopilotStore';
import { agentApi } from '@/infrastructure/api';
import type { AutopilotStreamData } from '@shared/types';
import { AutopilotHeader } from './AutopilotHeader';
import { AutopilotLiveLog } from './AutopilotLiveLog';
import { AutopilotFooter } from './AutopilotFooter';
import { AwaitingInputPanel } from './AwaitingInputPanel';
import { PhaseItem } from './PhaseItem';

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
  const [isStartingNext, setIsStartingNext] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

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
    const unsubscribe = agentApi.onStream((data: AutopilotStreamData) => {
      if (data.type === 'start') {
        clearLog();
        setWaitingForResponse(false);
        setCurrentAgent(data.agent || null);
      } else if (data.type === 'stdout' && data.data) {
        appendLog(data.data);
      } else if (data.type === 'stderr' && data.data) {
        appendLog(`[stderr] ${data.data}`);
      } else if (data.type === 'question' && data.data) {
        setWaitingForResponse(true);
        setCurrentAgent(data.agent || null);
        appendLog('\n--- Aguardando resposta ---\n');
      } else if (data.type === 'response-sent') {
        setWaitingForResponse(false);
        setResponseInput('');
        appendLog(`\n[Sua resposta: ${data.data}]\n`);
      }
    });

    return () => unsubscribe();
  }, [appendLog, clearLog]);

  // Handle sending response
  const handleSendResponse = async () => {
    if (!responseInput.trim() || !currentAgent) return;

    try {
      await agentApi.respond(currentAgent, responseInput.trim());
    } catch (err) {
      console.error('Failed to send response:', err);
      appendLog(`\n[Erro ao enviar resposta: ${err}]\n`);
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

  const isRunning = status === 'running';
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

      {/* Live Log - hidden when minimized */}
      {isRunning && !isMinimized && (
        <AutopilotLiveLog
          liveLog={liveLog}
          isMaximized={isMaximized}
          showLiveLog={showLiveLog}
          waitingForResponse={waitingForResponse}
          responseInput={responseInput}
          onToggleLog={() => setShowLiveLog(!showLiveLog)}
          onCopyLog={handleCopyLog}
          onResponseChange={setResponseInput}
          onSendResponse={handleSendResponse}
          copied={copied}
        />
      )}

      {/* Awaiting Input - show when paused for question */}
      {isAwaitingInput && !isMinimized && (
        <AwaitingInputPanel
          phases={phases}
          isSkipping={isSkipping}
          onExpandPhase={(index) => setExpandedPhase(index)}
          onSkipToNext={handleSkipToNext}
        />
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
