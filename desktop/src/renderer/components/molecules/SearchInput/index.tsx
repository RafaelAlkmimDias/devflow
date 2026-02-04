import { forwardRef, type InputHTMLAttributes, useState, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string
  onChange?: (value: string) => void
  onClear?: () => void
  onSearch?: (value: string) => void
  debounceMs?: number
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value = '', onChange, onClear, onSearch, debounceMs = 300, className, ...props }, ref) => {
    const [localValue, setLocalValue] = useState(value)

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value
        setLocalValue(newValue)
        onChange?.(newValue)
      },
      [onChange]
    )

    const handleClear = useCallback(() => {
      setLocalValue('')
      onChange?.('')
      onClear?.()
    }, [onChange, onClear])

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && onSearch) {
          onSearch(localValue)
        }
        if (e.key === 'Escape') {
          handleClear()
        }
      },
      [localValue, onSearch, handleClear]
    )

    const displayValue = value !== undefined ? value : localValue

    return (
      <div className={cn('relative flex items-center', className)}>
        <Search className="absolute left-3 w-4 h-4 text-gray-500 pointer-events-none" />
        <input
          ref={ref}
          type="text"
          value={displayValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className={cn(
            'w-full bg-black/30 border border-white/10 rounded-lg',
            'pl-9 pr-8 py-2 text-sm text-white placeholder:text-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50',
            'transition-all duration-200'
          )}
          {...props}
        />
        {displayValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 p-1 text-gray-500 hover:text-gray-300 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    )
  }
)

SearchInput.displayName = 'SearchInput'
