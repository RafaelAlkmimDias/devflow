import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { CommandItem } from './types';

interface CommandListProps {
  groupedCommands: Record<string, CommandItem[]>;
  selectedIndex: number;
  onExecute: (action: () => void) => void;
}

export const CommandList = forwardRef<HTMLDivElement, CommandListProps>(
  function CommandList({ groupedCommands, selectedIndex, onExecute }, ref) {
    const flatCommands = Object.values(groupedCommands).flat();
    let currentIndex = 0;

    if (flatCommands.length === 0) {
      return (
        <div ref={ref} className="max-h-[50vh] overflow-y-auto" role="listbox" aria-label="Commands">
          <div className="px-4 py-8 text-center text-gray-500 text-sm">
            No commands found
          </div>
        </div>
      );
    }

    return (
      <div ref={ref} className="max-h-[50vh] overflow-y-auto" role="listbox" aria-label="Commands">
        {Object.entries(groupedCommands).map(([category, cmds]) => (
          <div key={category}>
            <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-black/20">
              {category}
            </div>
            {cmds.map((cmd) => {
              const index = currentIndex++;
              const isSelected = index === selectedIndex;

              return (
                <button
                  key={cmd.id}
                  data-command-item
                  onClick={() => onExecute(cmd.action)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                    isSelected
                      ? 'bg-purple-500/20 border-l-2 border-purple-500'
                      : 'hover:bg-white/5 border-l-2 border-transparent'
                  )}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                >
                  <div className="text-gray-400">{cmd.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white">{cmd.label}</div>
                    {cmd.description && (
                      <div className="text-xs text-gray-500 truncate">
                        {cmd.description}
                      </div>
                    )}
                  </div>
                  {cmd.shortcut && (
                    <div className="text-xs text-gray-600 font-mono">
                      {cmd.shortcut}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  }
);
