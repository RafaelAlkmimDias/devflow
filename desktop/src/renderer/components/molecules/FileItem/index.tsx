import { cn } from '@/lib/utils'
import {
  File,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'

interface FileItemProps {
  name: string
  type: 'file' | 'directory'
  isExpanded?: boolean
  isSelected?: boolean
  isActive?: boolean
  depth?: number
  onClick?: () => void
  onToggle?: () => void
  onDoubleClick?: () => void
  onContextMenu?: (e: React.MouseEvent) => void
}

export function FileItem({
  name,
  type,
  isExpanded = false,
  isSelected = false,
  isActive = false,
  depth = 0,
  onClick,
  onToggle,
  onDoubleClick,
  onContextMenu,
}: FileItemProps) {
  const isDirectory = type === 'directory'

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick?.()
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggle?.()
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1 py-0.5 px-2 cursor-pointer rounded-sm',
        'text-sm text-gray-300 hover:bg-white/5 transition-colors',
        isSelected && 'bg-purple-500/20 text-white',
        isActive && 'bg-white/10'
      )}
      style={{ paddingLeft: depth * 12 + 8 }}
      onClick={handleClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      {isDirectory ? (
        <button
          className="p-0.5 hover:bg-white/10 rounded"
          onClick={handleToggle}
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3 text-gray-500" />
          ) : (
            <ChevronRight className="w-3 h-3 text-gray-500" />
          )}
        </button>
      ) : (
        <span className="w-4" />
      )}

      {isDirectory ? (
        isExpanded ? (
          <FolderOpen className="w-4 h-4 text-yellow-500 flex-shrink-0" />
        ) : (
          <Folder className="w-4 h-4 text-yellow-500 flex-shrink-0" />
        )
      ) : (
        <File className="w-4 h-4 text-gray-500 flex-shrink-0" />
      )}

      <span className="truncate ml-1">{name}</span>
    </div>
  )
}

// File icon based on extension
interface FileIconProps {
  filename: string
  className?: string
}

export function FileIcon({ filename: _filename, className }: FileIconProps) {
  // Could be extended to show different icons based on file extension
  return <File className={cn('w-4 h-4 text-gray-500', className)} />
}
