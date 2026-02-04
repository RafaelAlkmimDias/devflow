import { Bot, Zap, Shield, FileText } from 'lucide-react';

export interface TerminalTab {
  id: string;
  name: string;
  isActive: boolean;
  sessionId: string;
}

export interface TerminalPanelProps {
  projectPath: string;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  onClose?: () => void;
  height?: number;
  onHeightChange?: (height: number) => void;
}

// Agent quick actions
export const AGENT_ACTIONS = [
  { id: 'strategist', label: 'Strategist', command: 'claude /agents:strategist', color: '#3b82f6' },
  { id: 'architect', label: 'Architect', command: 'claude /agents:architect', color: '#8b5cf6' },
  { id: 'builder', label: 'Builder', command: 'claude /agents:builder', color: '#22c55e' },
  { id: 'guardian', label: 'Guardian', command: 'claude /agents:guardian', color: '#ef4444' },
  { id: 'chronicler', label: 'Chronicler', command: 'claude /agents:chronicler', color: '#f59e0b' },
];

// Quick commands
export const QUICK_COMMANDS = [
  { label: 'Claude', command: 'claude', icon: Bot },
  { label: 'New Feature', command: 'claude /quick:new-feature', icon: Zap },
  { label: 'Security', command: 'claude /quick:security-check', icon: Shield },
  { label: 'ADR', command: 'claude /quick:create-adr', icon: FileText },
];

// Terminal sizing constants
export const MIN_HEIGHT = 150;
export const MAX_HEIGHT = 600;
export const DEFAULT_HEIGHT = 256;

// Timing constants
export const WRITE_BUFFER_DELAY = 10; // ms - batch input writes
export const READ_BUFFER_DELAY = 16; // ms - batch output reads (~1 frame at 60fps)
export const RESIZE_DEBOUNCE_DELAY = 200; // ms - debounce resize events
