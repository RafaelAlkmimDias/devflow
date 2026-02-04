import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { terminalApi } from '@/infrastructure/api';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
import { TERMINAL_THEME, TERMINAL_OPTIONS } from './terminalTheme';
import {
  type TerminalTab,
  WRITE_BUFFER_DELAY,
  READ_BUFFER_DELAY,
  RESIZE_DEBOUNCE_DELAY,
} from './types';

interface UseTerminalOptions {
  projectPath: string;
  activeTab: TerminalTab | undefined;
}

export function useTerminal({ projectPath, activeTab }: UseTerminalOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Buffer refs
  const writeBufferRef = useRef<string>('');
  const writeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const readBufferRef = useRef<string>('');
  const readTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // State refs
  const isConnectedRef = useRef(false);
  const hasShownConnectToast = useRef(false);
  const isInitializingRef = useRef(false);
  const currentSessionIdRef = useRef<string | null>(null);

  const { terminalFontSize } = useSettingsStore();

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Initialize terminal
  const initTerminal = useCallback(async (sessionId: string) => {
    if (!containerRef.current) return;

    if (isInitializingRef.current && currentSessionIdRef.current === sessionId) {
      return;
    }

    if (currentSessionIdRef.current === sessionId && terminalRef.current && isConnectedRef.current) {
      return;
    }

    isInitializingRef.current = true;
    currentSessionIdRef.current = sessionId;

    if (terminalRef.current) {
      terminalRef.current.dispose();
      terminalRef.current = null;
    }
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    const currentFontSize = useSettingsStore.getState().terminalFontSize;

    const terminal = new Terminal({
      theme: TERMINAL_THEME,
      ...TERMINAL_OPTIONS,
      fontSize: currentFontSize,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    terminal.open(containerRef.current);

    try {
      const webglAddon = new WebglAddon();
      webglAddon.onContextLoss(() => {
        webglAddon.dispose();
      });
      terminal.loadAddon(webglAddon);
    } catch {
      console.warn('WebGL not supported, using canvas renderer');
    }

    setTimeout(() => {
      try {
        fitAddon.fit();
      } catch {
        // Ignore fit errors during init
      }
    }, 100);

    setIsConnecting(true);

    try {
      await terminalApi.create(sessionId, projectPath, terminal.cols, terminal.rows);

      const cleanup = terminalApi.onData((incomingSessionId, data) => {
        if (incomingSessionId !== sessionId) return;

        readBufferRef.current += data;

        if (readTimeoutRef.current) {
          clearTimeout(readTimeoutRef.current);
        }

        readTimeoutRef.current = setTimeout(() => {
          if (readBufferRef.current && terminalRef.current) {
            terminalRef.current.write(readBufferRef.current);
            readBufferRef.current = '';
          }
        }, READ_BUFFER_DELAY);
      });

      cleanupRef.current = cleanup;

      const exitCleanup = terminalApi.onExit((incomingSessionId, code) => {
        if (incomingSessionId !== sessionId) return;

        if (readBufferRef.current && terminalRef.current) {
          terminalRef.current.write(readBufferRef.current);
          readBufferRef.current = '';
        }
        terminal.write('\r\n\x1b[90m[Process exited with code ' + code + ']\x1b[0m\r\n');
      });

      const originalCleanup = cleanupRef.current;
      cleanupRef.current = () => {
        originalCleanup?.();
        exitCleanup();
      };

      setIsConnected(true);
      setIsConnecting(false);
      isConnectedRef.current = true;
      isInitializingRef.current = false;

      if (!hasShownConnectToast.current) {
        hasShownConnectToast.current = true;
        toast.success('Terminal ready', { duration: 1500 });
      }

      terminal.onData((data) => {
        writeBufferRef.current += data;

        if (writeTimeoutRef.current) {
          clearTimeout(writeTimeoutRef.current);
        }

        const isSpecialKey = data === '\r' || data === '\x03' || data === '\x04';
        const delay = isSpecialKey ? 0 : WRITE_BUFFER_DELAY;

        writeTimeoutRef.current = setTimeout(() => {
          const bufferedData = writeBufferRef.current;
          writeBufferRef.current = '';

          if (bufferedData) {
            terminalApi.write(sessionId, bufferedData).catch(() => {});
          }
        }, delay);
      });

    } catch (error) {
      console.error('Terminal init error:', error);
      terminal.write('\x1b[31mFailed to connect to terminal session\x1b[0m\r\n');
      setIsConnecting(false);
      isInitializingRef.current = false;
    }
  }, [projectPath]);

  // Handle resize with debouncing
  const handleResize = useCallback(() => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }

    resizeTimeoutRef.current = setTimeout(() => {
      if (!fitAddonRef.current || !terminalRef.current || !currentSessionIdRef.current) return;

      try {
        fitAddonRef.current.fit();
        const { cols, rows } = terminalRef.current;
        terminalApi.resize(currentSessionIdRef.current, cols, rows).catch(() => {});
      } catch {
        // Ignore fit errors
      }
    }, RESIZE_DEBOUNCE_DELAY);
  }, []);

  // Write command to terminal
  const writeCommand = useCallback((command: string) => {
    if (!currentSessionIdRef.current) return;
    terminalApi.write(currentSessionIdRef.current, command + '\r').catch(() => {});
  }, []);

  // Destroy session
  const destroySession = useCallback((sessionId: string) => {
    terminalApi.destroy(sessionId).catch(() => {});
  }, []);

  // Get current session ID
  const getCurrentSessionId = useCallback(() => currentSessionIdRef.current, []);

  // Cleanup current session
  const cleanupCurrentSession = useCallback(() => {
    cleanupRef.current?.();
    if (currentSessionIdRef.current) {
      terminalApi.destroy(currentSessionIdRef.current).catch(() => {});
    }
  }, []);

  // Initialize terminal on mount
  useEffect(() => {
    if (!activeTab) return;

    const uniqueSessionId = `${activeTab.sessionId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    initTerminal(uniqueSessionId);

    return () => {
      if (writeTimeoutRef.current) clearTimeout(writeTimeoutRef.current);
      if (readTimeoutRef.current) clearTimeout(readTimeoutRef.current);
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
      writeBufferRef.current = '';
      readBufferRef.current = '';
      hasShownConnectToast.current = false;
      isInitializingRef.current = false;
      isConnectedRef.current = false;
      currentSessionIdRef.current = null;

      if (terminalRef.current) {
        try { terminalRef.current.dispose(); } catch {}
        terminalRef.current = null;
      }
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      terminalApi.destroy(uniqueSessionId).catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab?.id]);

  // Update font size without reinitializing terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.fontSize = terminalFontSize;
      setTimeout(() => {
        if (fitAddonRef.current && currentSessionIdRef.current) {
          try {
            fitAddonRef.current.fit();
            const { cols, rows } = terminalRef.current!;
            terminalApi.resize(currentSessionIdRef.current, cols, rows).catch(() => {});
          } catch {}
        }
      }, 50);
    }
  }, [terminalFontSize]);

  // Setup resize observer
  useEffect(() => {
    if (!containerRef.current) return;

    resizeObserverRef.current = new ResizeObserver(() => handleResize());
    resizeObserverRef.current.observe(containerRef.current);

    return () => resizeObserverRef.current?.disconnect();
  }, [handleResize]);

  return {
    containerRef,
    isConnected,
    isConnecting,
    handleResize,
    writeCommand,
    destroySession,
    getCurrentSessionId,
    cleanupCurrentSession,
  };
}
