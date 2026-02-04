import {
  Terminal as TerminalIcon,
  Plus,
  X,
  Maximize2,
  Minimize2,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TerminalTab } from './types';

interface TerminalHeaderProps {
  tabs: TerminalTab[];
  isConnected: boolean;
  isConnecting: boolean;
  isMaximized?: boolean;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onAddTab: () => void;
  onToggleMaximize?: () => void;
  onClose?: () => void;
}

export function TerminalHeader({
  tabs,
  isConnected,
  isConnecting,
  isMaximized,
  onSelectTab,
  onCloseTab,
  onAddTab,
  onToggleMaximize,
  onClose,
}: TerminalHeaderProps) {
  return (
    <div className="flex items-center justify-between px-2 py-1 bg-[#12121a] border-b border-white/10 flex-shrink-0">
      <div className="flex items-center gap-1">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-1 rounded text-xs cursor-pointer group',
              tab.isActive
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            )}
          >
            <TerminalIcon className="w-3 h-3" />
            {tab.name}
            {tab.isActive && (
              <span className={cn(
                'w-1.5 h-1.5 rounded-full',
                isConnected ? 'bg-green-400' : isConnecting ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'
              )} />
            )}
            {tabs.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); onCloseTab(tab.id); }}
                className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={onAddTab}
          className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onToggleMaximize}
          className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
        >
          {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
