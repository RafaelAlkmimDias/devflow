import { ChevronDown, ChevronRight } from 'lucide-react';
import { getFileIcon } from './fileIcons';
import { HighlightedMatch } from './HighlightedMatch';
import type { GroupedResult } from './types';

interface SearchResultItemProps {
  result: GroupedResult;
  isExpanded: boolean;
  onToggle: () => void;
  onMatchClick: (filePath: string, line: number) => void;
}

export function SearchResultItem({
  result,
  isExpanded,
  onToggle,
  onMatchClick,
}: SearchResultItemProps) {
  return (
    <div>
      {/* File Header */}
      <button
        onClick={onToggle}
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
              onClick={() => onMatchClick(result.filePath, match.line)}
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
}
