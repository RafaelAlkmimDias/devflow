import { useState, useEffect, useRef, useMemo } from 'react';
import { useUIStore } from '@/lib/stores/uiStore';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useCommands } from './useCommands';
import { CommandInput } from './CommandInput';
import { CommandList } from './CommandList';

export function CommandPalette() {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const { activeModal, closeModal } = useUIStore();
  const commands = useCommands();

  const isOpen = activeModal === 'commandPalette';

  // Focus trap for accessibility
  useFocusTrap(modalRef, isOpen, {
    onEscape: closeModal,
    autoFocus: false,
  });

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;

    const lowerQuery = query.toLowerCase();
    return commands.filter((cmd) => {
      const searchText = `${cmd.label} ${cmd.description || ''} ${cmd.category}`.toLowerCase();
      return searchText.includes(lowerQuery);
    });
  }, [commands, query]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, typeof commands> = {};
    for (const cmd of filteredCommands) {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    }
    return groups;
  }, [filteredCommands]);

  // Flatten for keyboard navigation
  const flatCommands = useMemo(() => {
    return Object.values(groupedCommands).flat();
  }, [groupedCommands]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatCommands.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (flatCommands[selectedIndex]) {
          flatCommands[selectedIndex].action();
        }
        break;
      case 'Escape':
        e.preventDefault();
        closeModal();
        break;
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    const listElement = listRef.current;
    if (!listElement) return;

    const items = listElement.querySelectorAll('[data-command-item]');
    const selectedElement = items[selectedIndex] as HTMLElement;
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Handle query change
  const handleQueryChange = (value: string) => {
    setQuery(value);
    setSelectedIndex(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeModal}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative w-full max-w-xl bg-[#12121a] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <CommandInput
          ref={inputRef}
          value={query}
          onChange={handleQueryChange}
          onKeyDown={handleKeyDown}
        />

        <CommandList
          ref={listRef}
          groupedCommands={groupedCommands}
          selectedIndex={selectedIndex}
          onExecute={(action) => action()}
        />

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-white/10 text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span>↑↓ navigate</span>
            <span>↵ execute</span>
          </div>
        </div>
      </div>
    </div>
  );
}
