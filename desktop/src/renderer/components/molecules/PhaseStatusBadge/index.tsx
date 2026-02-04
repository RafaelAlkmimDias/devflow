import { cn } from '@/lib/utils'
import {
  Clock,
  Loader2,
  Check,
  X,
  FastForward,
} from 'lucide-react'
import type { PhaseStatus } from '@/domain/types'

interface PhaseStatusBadgeProps {
  status: PhaseStatus
  showLabel?: boolean
  size?: 'sm' | 'md'
  className?: string
}

const statusConfig: Record<
  PhaseStatus,
  { icon: typeof Clock; color: string; bgColor: string; label: string }
> = {
  pending: {
    icon: Clock,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
    label: 'Pending',
  },
  running: {
    icon: Loader2,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    label: 'Running',
  },
  completed: {
    icon: Check,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    label: 'Completed',
  },
  failed: {
    icon: X,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    label: 'Failed',
  },
  skipped: {
    icon: FastForward,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    label: 'Skipped',
  },
}

export function PhaseStatusBadge({
  status,
  showLabel = true,
  size = 'sm',
  className,
}: PhaseStatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon
  const isAnimated = status === 'running'

  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        config.bgColor,
        config.color,
        sizeClasses,
        className
      )}
    >
      <Icon className={cn(iconSize, isAnimated && 'animate-spin')} />
      {showLabel && <span>{config.label}</span>}
    </span>
  )
}

// Simplified version showing just an icon
interface PhaseStatusIconProps {
  status: PhaseStatus
  className?: string
}

export function PhaseStatusIcon({ status, className }: PhaseStatusIconProps) {
  const config = statusConfig[status]
  const Icon = config.icon
  const isAnimated = status === 'running'

  return (
    <Icon
      className={cn(
        'w-4 h-4',
        config.color,
        isAnimated && 'animate-spin',
        className
      )}
    />
  )
}
