import { useState, useEffect, useRef, useCallback } from 'react';
import { useUIStore } from '@/lib/stores/uiStore';
import { useProjectStore } from '@/lib/stores/projectStore';
import { useFileStore } from '@/lib/stores/fileStore';
import { api } from '@/api';
import {
  Search,
  File,
  FileText,
  FileCode,
  FileJson,
  X,
  ChevronDown,
  ChevronRight,
  CaseSensitive,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface GroupedResult {
  filePath: string;
  relativePath: string;
  fileName: string;
  matches: Array<{
    line: number;
    content: string;
    match: string;
  }>;
}

const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'md':
      return <FileText className="w-4 h-4 text-blue-400" />;
    case 'json':
    case 'yaml':
    case 'yml':
      return <FileJson className="w-4 h-4 text-yellow-400" />;
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
      return <FileCode className="w-4 h-4 text-green-400" />;
    default:
      return <File className="w-4 h-4 text-gray-400" />;
  }
};

function HighlightedMatch({ content, match }: { content: string; match: string }) {
  const idx = content.toLowerCase().indexOf(match.toLowerCase());
  if (idx === -1) {
    return <span>{content}</span>;
  }

  const before = content.slice(0, idx);
  const highlighted = content.slice(idx, idx + match.length);
  const after = content.slice(idx + match.length);

  return (
    <>
      <span>{before}</span>
      <span className="bg-yellow-500/30 text-yellow-200">{highlighted}</span>
      <span>{after}</span>
    </>
  );
}

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GroupedResult[]>([]);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [totalMatches, setTotalMatches] = useState(0);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const { activeModal, closeModal } = useUIStore();
  const { currentProject } = useProjectStore();
  const { openFile, setScrollToLine } = useFileStore();

  const isOpen = activeModal === 'globalSearch';

  // Focus trap for accessibility
  useFocusTrap(modalRef, isOpen, {
    onEscape: closeModal,
    autoFocus: false,
  });

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setExpandedFiles(new Set());
      setTotalMatches(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Search content
  const searchContent = useCallback(async (searchQuery: string) => {
    if (!currentProject || !searchQuery.trim()) {
      setResults([]);
      setTotalMatches(0);
      return;
    }

    setIsLoading(true);
    try {
      const searchResults = await api.searchCode(currentProject.path, searchQuery, {
        caseSensitive,
        maxResults: 100,
      });

      // Group results by file
      const grouped = new Map<string, GroupedResult>();

      for (const result of searchResults) {
        const existing = grouped.get(result.file);
        if (existing) {
          existing.matches.push({
            line: result.line,
            content: result.content,
            match: result.match,
          });
        } else {
          const fileName = result.file.split('/').pop() || result.file;
          const relativePath = result.file.replace(currentProject.path + '/', '');
          grouped.set(result.file, {
            filePath: result.file,
            relativePath,
            fileName,
            matches: [{
              line: result.line,
              content: result.content,
              match: result.match,
            }],
          });
        }
      }

      const groupedResults = Array.from(grouped.values());
      setResults(groupedResults);
      setTotalMatches(searchResults.length);

      // Auto-expand first few results
      const firstFiles = groupedResults.slice(0, 3).map((r) => r.filePath);
      setExpandedFiles(new Set(firstFiles));
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentProject, caseSensitive]);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      searchContent(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, isOpen, searchContent]);

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

  const toggleFile = (filePath: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
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
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <Search className="w-5 h-5 text-gray-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search in files..."
            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm"
            autoComplete="off"
            spellCheck={false}
          />

          {/* Options */}
          <button
            onClick={() => setCaseSensitive(!caseSensitive)}
            className={cn(
              'p-1.5 rounded transition-colors',
              caseSensitive
                ? 'bg-purple-500/20 text-purple-300'
                : 'text-gray-500 hover:bg-white/10'
            )}
            title="Case Sensitive"
            aria-label="Toggle case sensitivity"
            aria-pressed={caseSensitive}
          >
            <CaseSensitive className="w-4 h-4" aria-hidden="true" />
          </button>

          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
          <div className="text-xs text-gray-600 border border-white/10 px-1.5 py-0.5 rounded">
            esc
          </div>
        </div>

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
              {results.map((result) => {
                const isExpanded = expandedFiles.has(result.filePath);
                return (
                  <div key={result.filePath}>
                    {/* File Header */}
                    <button
                      onClick={() => toggleFile(result.filePath)}
                      className="w-full flex items-center gap-2 px-4 py-2 hover:bg-white/5 transition-colors text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                      {getFileIcon(result.fileName)}
                      <span className="text-sm text-white truncate flex-1">
                        {result.fileName}
                      </span>
                      <span className="text-xs text-gray-500 truncate max-w-[200px]">
                        {result.relativePath}
                      </span>
                      <span className="text-xs text-purple-400 ml-2">
                        {result.matches.length} match{result.matches.length !== 1 && 'es'}
                      </span>
                    </button>

                    {/* Matches */}
                    {isExpanded && (
                      <div className="bg-black/20">
                        {result.matches.slice(0, 10).map((match, idx) => (
                          <button
                            key={`${result.filePath}-${match.line}-${idx}`}
                            onClick={() => handleMatchClick(result.filePath, match.line)}
                            className="w-full px-4 py-1.5 pl-10 text-left hover:bg-white/5 transition-colors"
                          >
                            <div className="text-xs font-mono text-gray-400 truncate">
                              <span className="text-gray-600">{match.line}: </span>
                              <HighlightedMatch content={match.content} match={match.match} />
                            </div>
                          </button>
                        ))}
                        {result.matches.length > 10 && (
                          <div className="px-4 py-1.5 pl-10 text-xs text-gray-500">
                            +{result.matches.length - 10} more matches
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
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
