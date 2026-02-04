import { useState, useRef } from 'react';
import { useUIStore } from '@/lib/stores/uiStore';
import { useFileStore } from '@/lib/stores/fileStore';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useGlobalSearch } from './useGlobalSearch';
import { SearchInput } from './SearchInput';
import { SearchResultItem } from './SearchResultItem';

export function GlobalSearch() {
  const [caseSensitive, setCaseSensitive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const { activeModal, closeModal } = useUIStore();
  const { openFile, setScrollToLine } = useFileStore();

  const isOpen = activeModal === 'globalSearch';

  const {
    query,
    setQuery,
    results,
    expandedFiles,
    isLoading,
    totalMatches,
    toggleFile,
  } = useGlobalSearch({ isOpen, caseSensitive });

  // Focus trap for accessibility
  useFocusTrap(modalRef, isOpen, {
    onEscape: closeModal,
    autoFocus: false,
  });

  // Focus input when opened
  if (isOpen) {
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        closeModal();
        break;
      case 'Enter':
        e.preventDefault();
        if (results.length > 0) {
          const file = results[0];
          if (file && file.matches[0]) {
            handleMatchClick(file.filePath, file.matches[0].line);
          }
        }
        break;
    }
  };

  const handleMatchClick = (filePath: string, line: number) => {
    openFile(filePath);
    setScrollToLine(line);
    closeModal();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeModal}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative w-full max-w-3xl bg-[#12121a] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Search in files"
      >
        <SearchInput
          ref={inputRef}
          value={query}
          onChange={setQuery}
          onKeyDown={handleKeyDown}
          caseSensitive={caseSensitive}
          onToggleCaseSensitive={() => setCaseSensitive(!caseSensitive)}
        />

        {/* Results */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              {query ? 'No results found' : 'Type to search in files...'}
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {results.map((result) => (
                <SearchResultItem
                  key={result.filePath}
                  result={result}
                  isExpanded={expandedFiles.has(result.filePath)}
                  onToggle={() => toggleFile(result.filePath)}
                  onMatchClick={handleMatchClick}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-white/10 text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span>Click to open file at line</span>
          </div>
          <div>
            {totalMatches > 0 && `${totalMatches} matches in ${results.length} files`}
          </div>
        </div>
      </div>
    </div>
  );
}
