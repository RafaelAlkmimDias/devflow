import type { PhaseResult, AgentId } from '@/lib/stores/autopilotStore';

export interface AutopilotState {
  status: string;
  phases: PhaseResult[];
  specTitle: string;
  error?: string | null;
  currentPhaseIndex: number;
  liveLog: string;
}

export interface AutopilotActions {
  reset: () => void;
  resumeRun: () => void;
  continuePhase: (phaseIndex: number, userResponse: string) => Promise<void>;
  runNextAgent: () => Promise<void>;
  getNextAgent: () => AgentId | null;
  skipToNextAgent: () => Promise<void>;
  appendLog: (text: string) => void;
  clearLog: () => void;
}

export const AGENT_INFO: Record<AgentId, { icon: string; color: string; name: string }> = {
  strategist: { icon: '📊', color: 'text-blue-400', name: 'Strategist' },
  architect: { icon: '🏗️', color: 'text-purple-400', name: 'Architect' },
  designer: { icon: '🎨', color: 'text-rose-400', name: 'Designer' },
  builder: { icon: '🔨', color: 'text-amber-400', name: 'Builder' },
  guardian: { icon: '🛡️', color: 'text-green-400', name: 'Guardian' },
  chronicler: { icon: '📝', color: 'text-pink-400', name: 'Chronicler' },
};
