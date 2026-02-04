import { forwardRef } from 'react';
import { Command, X } from 'lucide-react';

interface CommandInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export const CommandInput = forwardRef<HTMLInputElement, CommandInputProps>(
  function CommandInput({ value, onChange, onKeyDown }, ref) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <Command className="w-5 h-5 text-purple-400" />
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type a command..."
          className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm"
          autoComplete="off"
          spellCheck={false}
        />
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
