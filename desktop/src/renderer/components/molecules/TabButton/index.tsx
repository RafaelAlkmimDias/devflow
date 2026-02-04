import { cn } from '@/lib/utils'
import { X, Pin } from 'lucide-react'
import type { ReactNode, MouseEvent } from 'react'

interface TabButtonProps {
  label: string
  icon?: ReactNode
  isActive?: boolean
  isDirty?: boolean
  isPinned?: boolean
  onSelect?: () => void
  onClose?: () => void
  onPin?: () => void
  onContextMenu?: (e: MouseEvent) => void
}

export function TabButton({
  label,
  icon,
  isActive = false,
  isDirty = false,
  isPinned = false,
  onSelect,
  onClose,
  onPin,
  onContextMenu,
}: TabButtonProps) {
  const handleClose = (e: MouseEvent) => {
    e.stopPropagation()
    onClose?.()
  }

  const handlePin = (e: MouseEvent) => {
    e.stopPropagation()
    onPin?.()
  }

  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer',
        'border-r border-white/5 transition-colors',
        isActive
          ? 'bg-[#1a1a2e] text-white border-t-2 border-t-purple-500'
          : 'bg-[#0d0d1a] text-gray-400 hover:bg-white/5 border-t-2 border-t-transparent'
      )}
      onClick={onSelect}
      onContextMenu={onContextMenu}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}

      <span className="truncate max-w-[120px]">
        {label}
        {isDirty && <span className="text-purple-400 ml-0.5">*</span>}
      </span>

      <div className="flex items-center gap-0.5 ml-1">
        {isPinned && (
          <Pin
            className="w-3 h-3 text-purple-400 cursor-pointer hover:text-purple-300"
            onClick={handlePin}
          />
        )}
        {onClose && !isPinned && (
          <button
            className={cn(
              'p-0.5 rounded hover:bg-white/10 transition-colors',
              'opacity-0 group-hover:opacity-100',
              isActive && 'opacity-100'
            )}
            onClick={handleClose}
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  )
}
