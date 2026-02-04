import { cn } from '@/lib/utils'
import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { Search } from 'lucide-react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ leftIcon, rightIcon, error, className, ...props }, ref) => {
    return (
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full bg-black/30 border rounded-lg text-sm text-white placeholder:text-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            leftIcon ? 'pl-10' : 'pl-3',
            rightIcon ? 'pr-10' : 'pr-3',
            'py-2',
            error ? 'border-red-500/50' : 'border-white/10',
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {rightIcon}
          </div>
        )}
        {error && (
          <p className="mt-1 text-xs text-red-400">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

// Search input variant
interface SearchInputProps extends Omit<InputProps, 'leftIcon'> {
  onClear?: () => void
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onClear, value, className, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        leftIcon={<Search className="w-4 h-4" />}
        rightIcon={
          value && onClear ? (
            <button
              onClick={onClear}
              className="text-gray-400 hover:text-gray-300"
            >
              &times;
            </button>
          ) : null
        }
        value={value}
        className={className}
        {...props}
      />
    )
  }
)

SearchInput.displayName = 'SearchInput'
