import { cn } from '@/lib/utils'
import { GitBranch, ChevronDown, Check } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface Branch {
  name: string
  current: boolean
  commit?: string
}

interface BranchSelectorProps {
  currentBranch: string
  branches: Branch[]
  onSelect: (branch: string) => void
  className?: string
}

export function BranchSelector({
  currentBranch,
  branches,
  onSelect,
  className,
}: BranchSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm',
          'bg-white/5 hover:bg-white/10 transition-colors',
          'text-gray-300 hover:text-white'
        )}
      >
        <GitBranch className="w-4 h-4 text-purple-400" />
        <span className="max-w-[150px] truncate">{currentBranch}</span>
        <ChevronDown
          className={cn(
            'w-4 h-4 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute top-full mt-1 left-0 z-50 min-w-[200px]',
            'bg-[#1a1a2e] border border-white/10 rounded-lg shadow-xl',
            'max-h-[300px] overflow-y-auto'
          )}
        >
          {branches.map((branch) => (
            <button
              key={branch.name}
              onClick={() => {
                onSelect(branch.name)
                setIsOpen(false)
              }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-sm text-left',
                'hover:bg-white/5 transition-colors',
                branch.current ? 'text-white' : 'text-gray-400'
              )}
            >
              <GitBranch className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <span className="truncate flex-1">{branch.name}</span>
              {branch.current && (
                <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
