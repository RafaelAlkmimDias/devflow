import type { ITheme } from '@xterm/xterm';

export const TERMINAL_THEME: ITheme = {
  background: '#0a0a0f',
  foreground: '#e4e4e7',
  cursor: '#a855f7',
  cursorAccent: '#0a0a0f',
  selectionBackground: '#a855f740',
  selectionForeground: '#ffffff',
  black: '#18181b',
  red: '#ef4444',
  green: '#22c55e',
  yellow: '#eab308',
  blue: '#3b82f6',
  magenta: '#a855f7',
  cyan: '#06b6d4',
  white: '#e4e4e7',
  brightBlack: '#71717a',
  brightRed: '#f87171',
  brightGreen: '#4ade80',
  brightYellow: '#facc15',
  brightBlue: '#60a5fa',
  brightMagenta: '#c084fc',
  brightCyan: '#22d3ee',
  brightWhite: '#ffffff',
};

export const TERMINAL_OPTIONS = {
  fontFamily: 'Menlo, Monaco, "Courier New", monospace',
  fontWeight: '400' as const,
  fontWeightBold: '600' as const,
  letterSpacing: 0,
  lineHeight: 1.2,
  cursorBlink: true,
  cursorStyle: 'bar' as const,
  scrollback: 10000,
  allowProposedApi: true,
};
