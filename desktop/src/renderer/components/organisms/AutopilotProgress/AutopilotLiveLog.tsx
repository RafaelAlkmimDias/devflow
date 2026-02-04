import { useRef, useEffect } from 'react';
import {
  Terminal,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  MessageCircle,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutopilotLiveLogProps {
  liveLog: string;
  isMaximized: boolean;
  showLiveLog: boolean;
  waitingForResponse: boolean;
  responseInput: string;
  onToggleLog: () => void;
  onCopyLog: () => void;
  onResponseChange: (value: string) => void;
  onSendResponse: () => void;
  copied: boolean;
}

export function AutopilotLiveLog({
  liveLog,
  isMaximized,
  showLiveLog,
  waitingForResponse,
  responseInput,
  onToggleLog,
  onCopyLog,
  onResponseChange,
  onSendResponse,
  copied,
}: AutopilotLiveLogProps) {
  const logEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll log to bottom
  useEffect(() => {
    if (logEndRef.current && showLiveLog) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveLog, showLiveLog]);

  // Focus input when waiting for response
  useEffect(() => {
    if (waitingForResponse && inputRef.current) {
      inputRef.current.focus();
    }
  }, [waitingForResponse]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendResponse();
    }
  };

  return (
    <div className={cn(
      'border-t border-white/10',
      isMaximized && !showLiveLog && 'border-b'
    )}>
      <div className="px-4 py-2 flex items-center justify-between bg-black/20">
        <button
          onClick={onToggleLog}
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <Terminal className="w-3 h-3" />
          <span>Live Output</span>
          {liveLog.length > 0 && (
            <span className="text-gray-500">({Math.round(liveLog.length / 1024)}KB)</span>
          )}
        </button>
        <div className="flex items-center gap-1">
          {liveLog.length > 0 && (
            <button
              onClick={onCopyLog}
              className="p-1 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-white"
              title={copied ? 'Copiado!' : 'Copiar output'}
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          <button
            onClick={onToggleLog}
            className="p-1 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-white"
            title={showLiveLog ? 'Minimizar output' : 'Expandir output'}
          >
            {showLiveLog ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
      {showLiveLog && (
        <div className={cn(
          'bg-black/40 overflow-y-auto font-mono text-xs',
          isMaximized ? 'flex-1 max-h-[400px]' : 'max-h-32'
        )}>
          <pre className="p-3 text-gray-300 whitespace-pre-wrap break-all">
            {liveLog || 'Waiting for output...'}
            <div ref={logEndRef} />
          </pre>
        </div>
      )}

      {/* Response Input - shown when agent asks a question */}
      {waitingForResponse && (
        <div className="px-3 py-2 bg-yellow-500/10 border-t border-yellow-500/20">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-yellow-400 font-medium">Agent is waiting for your response</span>
          </div>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={responseInput}
              onChange={(e) => onResponseChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your response and press Enter..."
              className="flex-1 px-3 py-2 bg-black/40 border border-yellow-500/30 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50"
            />
            <button
              onClick={onSendResponse}
              disabled={!responseInput.trim()}
              className="px-3 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Send response"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
