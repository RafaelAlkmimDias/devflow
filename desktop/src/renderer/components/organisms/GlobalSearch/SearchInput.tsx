import { forwardRef } from 'react';
import { Search, X, CaseSensitive } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  caseSensitive: boolean;
  onToggleCaseSensitive: () => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput({ value, onChange, onKeyDown, caseSensitive, onToggleCaseSensitive }, ref) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <Search className="w-5 h-5 text-gray-500" />
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search in files..."
          className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm"
          autoComplete="off"
          spellCheck={false}
        />

        <button
          onClick={onToggleCaseSensitive}
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

        {value && (
          <button
            onClick={() => onChange('')}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        )}
        <div className="text-xs text-gray-600 border border-white/10 px-1.5 py-0.5 rounded">
          esc
        </div>
      </div>
    );
  }
);
