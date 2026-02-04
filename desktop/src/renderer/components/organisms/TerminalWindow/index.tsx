import { useEffect, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import '@xterm/xterm/css/xterm.css';

import { TerminalHeader } from './TerminalHeader';
import { TerminalQuickActions } from './TerminalQuickActions';
import { ResizeHandle } from './ResizeHandle';
import { useTerminal } from './useTerminal';
import {
  type TerminalTab,
  type TerminalPanelProps,
  MIN_HEIGHT,
  MAX_HEIGHT,
  DEFAULT_HEIGHT,
} from './types';

export function TerminalWindow({
  projectPath,
  isMaximized,
  onToggleMaximize,
  onClose,
  height = DEFAULT_HEIGHT,
  onHeightChange,
}: TerminalPanelProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [tabs, setTabs] = useState<TerminalTab[]>(() => [
    { id: '1', name: 'Terminal 1', isActive: true, sessionId: 'terminal-' + Date.now() + '-1' }
  ]);

  const activeTab = tabs.find(t => t.isActive);

  // Terminal management
  const terminal = useTerminal({
    projectPath,
    activeTab,
  });

  // Tab management
  const addTab = useCallback(() => {
    const newId = String(Date.now());
    const newSessionId = 'terminal-' + newId;

    terminal.cleanupCurrentSession();

    setTabs(prevTabs => [
      ...prevTabs.map(t => ({ ...t, isActive: false })),
      { id: newId, name: 'Terminal ' + (prevTabs.length + 1), isActive: true, sessionId: newSessionId }
    ]);
  }, [terminal]);

  const closeTab = useCallback((id: string) => {
    setTabs(prevTabs => {
      if (prevTabs.length === 1) return prevTabs;

      const tabToClose = prevTabs.find(t => t.id === id);
      if (tabToClose?.isActive) {
        terminal.destroySession(terminal.getCurrentSessionId() || '');
      }

      const remaining = prevTabs.filter(t => t.id !== id);
      const wasActive = prevTabs.find(t => t.id === id)?.isActive;

      if (wasActive && remaining.length > 0) {
        remaining[0] = { ...remaining[0], isActive: true };
      }

      return remaining;
    });
  }, [terminal]);

  const selectTab = useCallback((id: string) => {
    setTabs(prevTabs => {
      const currentActive = prevTabs.find(t => t.isActive);
      if (currentActive?.id === id) return prevTabs;

      terminal.cleanupCurrentSession();

      return prevTabs.map(t => ({ ...t, isActive: t.id === id }));
    });
  }, [terminal]);

  // Handle resize drag
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const startY = e.clientY;
    const startHeight = height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = startY - moveEvent.clientY;
      const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeight + deltaY));
      onHeightChange?.(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, [height, onHeightChange]);

  // Handle maximize/minimize resize
  useEffect(() => {
    const timer = setTimeout(() => terminal.handleResize(), 100);
    return () => clearTimeout(timer);
  }, [isMaximized, terminal.handleResize]);

  return (
    <div
      className={cn(
        'flex flex-col bg-[#0a0a0f] text-white border-t border-white/10',
        isMaximized && 'h-full'
      )}
      style={isMaximized ? undefined : { height }}
    >
      {!isMaximized && (
        <ResizeHandle
          isResizing={isResizing}
          onMouseDown={handleResizeStart}
        />
      )}

      <TerminalHeader
        tabs={tabs}
        isConnected={terminal.isConnected}
        isConnecting={terminal.isConnecting}
        isMaximized={isMaximized}
        onSelectTab={selectTab}
        onCloseTab={closeTab}
        onAddTab={addTab}
        onToggleMaximize={onToggleMaximize}
        onClose={onClose}
      />

      <div
        ref={terminal.containerRef}
        className="flex-1 min-h-0 p-1"
        style={{ backgroundColor: '#0a0a0f' }}
      />

      <TerminalQuickActions onWriteCommand={terminal.writeCommand} />
    </div>
  );
}

// Re-export for backwards compatibility
export { TerminalWindow as TerminalPanel };
