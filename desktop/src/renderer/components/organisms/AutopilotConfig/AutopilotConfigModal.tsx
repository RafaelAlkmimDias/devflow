import { useState, useRef, useMemo } from 'react';
import { X, Rocket, CheckCircle2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useAutopilotStore,
  DEFAULT_CONFIG,
  type AgentId,
  type AutopilotConfig,
  type SpecPhaseHistory,
} from '@/lib/stores/autopilotStore';
import { useFocusTrap } from '@/hooks/useFocusTrap';

const AGENTS: { id: AgentId; icon: string; name: string; description: string }[] = [
  { id: 'strategist', icon: '📊', name: 'Planning', description: 'Refines requirements and creates acceptance criteria' },
  { id: 'architect', icon: '🏗️', name: 'Design', description: 'Defines architecture and technical decisions' },
  { id: 'builder', icon: '🔨', name: 'Implementation', description: 'Implements code and creates files' },
  { id: 'guardian', icon: '🛡️', name: 'Validation', description: 'Reviews security and quality' },
  { id: 'chronicler', icon: '📝', name: 'Documentation', description: 'Updates documentation' },
];

interface AutopilotConfigModalProps {
  projectPath: string;
}

export function AutopilotConfigModal({ projectPath }: AutopilotConfigModalProps) {
  const {
    isConfigModalOpen,
    closeConfigModal,
    selectedSpecTitle,
    selectedSpecId,
    startRun,
    getCompletedPhasesForSpec,
    clearHistoryForSpec,
  } = useAutopilotStore();

  const [config, setConfig] = useState<AutopilotConfig>(DEFAULT_CONFIG);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Get completed phases for this spec
  const completedPhases = useMemo(() => {
    if (!selectedSpecId) return {} as Record<AgentId, SpecPhaseHistory>;
    return getCompletedPhasesForSpec(selectedSpecId);
  }, [selectedSpecId, getCompletedPhasesForSpec]);

  // Format date for display
  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Handle clearing history
  const handleClearHistory = () => {
    if (selectedSpecId) {
      clearHistoryForSpec(selectedSpecId);
    }
  };

  // Focus trap for accessibility
  useFocusTrap(modalRef, isConfigModalOpen, {
    onEscape: closeConfigModal,
  });

  if (!isConfigModalOpen) return null;

  const togglePhase = (agentId: AgentId) => {
    setConfig((prev) => {
      const phases = prev.phases.includes(agentId)
        ? prev.phases.filter((p) => p !== agentId)
        : [...prev.phases, agentId];
      return { ...prev, phases };
    });
  };

  const handleStart = async () => {
    if (config.phases.length === 0) return;

    setIsStarting(true);
    setError(null);
    try {
      await startRun(config, projectPath);
    } catch (err) {
      console.error('Failed to start autopilot:', err);
      setError(err instanceof Error ? err.message : 'Failed to start');
    } finally {
      setIsStarting(false);
    }
  };

  // Estimate time based on phases selected
  const estimatedMinutes = config.phases.reduce((acc, phase) => {
    const times: Record<AgentId, number> = {
      strategist: 2,
      architect: 5,
      builder: 10,
      guardian: 5,
      chronicler: 2,
    };
    return acc + (times[phase] || 3);
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeConfigModal}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative w-full max-w-lg bg-[#12121a] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="autopilot-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
          <div className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-purple-400" aria-hidden="true" />
            <h2 id="autopilot-modal-title" className="text-lg font-semibold text-white">
              Start Autopilot
            </h2>
          </div>
          <button
            onClick={closeConfigModal}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Spec info */}
        <div className="px-6 py-3 border-b border-white/5 bg-white/5">
          <p className="text-sm text-gray-400">Spec:</p>
          <p className="text-white font-medium truncate">{selectedSpecTitle}</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Phases */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-300">Phases to execute</h3>
              {Object.keys(completedPhases).length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  title="Limpar histórico desta spec"
                >
                  <RotateCcw className="w-3 h-3" />
                  Limpar histórico
                </button>
              )}
            </div>
            <div className="space-y-2">
              {AGENTS.map((agent) => {
                const history = completedPhases[agent.id];
                const wasCompleted = !!history;

                return (
                  <label
                    key={agent.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                      config.phases.includes(agent.id)
                        ? 'bg-purple-500/10 border-purple-500/30'
                        : wasCompleted
                        ? 'bg-green-500/5 border-green-500/20 hover:bg-green-500/10'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={config.phases.includes(agent.id)}
                      onChange={() => togglePhase(agent.id)}
                      className="sr-only"
                    />
                    <div
                      className={cn(
                        'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                        config.phases.includes(agent.id)
                          ? 'bg-purple-500 border-purple-500'
                          : 'border-gray-500'
                      )}
                    >
                      {config.phases.includes(agent.id) && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{agent.icon}</span>
                        <span className="text-sm font-medium text-white">{agent.name}</span>
                        {wasCompleted && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-green-500/20 text-green-400 text-[10px] rounded">
                            <CheckCircle2 className="w-3 h-3" />
                            Executado
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{agent.description}</p>
                      {wasCompleted && history.completedAt && (
                        <p className="text-[10px] text-green-400/70 mt-1">
                          Última execução: {formatDate(history.completedAt)}
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Estimate */}
          <div className="p-3 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Estimated time:</span>
              <span className="text-gray-300">~{estimatedMinutes} min</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Each phase runs sequentially. Builder may take longer.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 bg-[#0a0a0f]">
          <button
            onClick={closeConfigModal}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={config.phases.length === 0 || isStarting}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              config.phases.length === 0 || isStarting
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-500 text-white'
            )}
          >
            {isStarting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4" />
                Start
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
