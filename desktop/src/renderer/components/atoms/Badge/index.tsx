import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple'
export type BadgeSize = 'sm' | 'md'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  size?: BadgeSize
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-white/10 text-gray-300',
  success: 'bg-green-500/20 text-green-400',
  warning: 'bg-yellow-500/20 text-yellow-400',
  error: 'bg-red-500/20 text-red-400',
  info: 'bg-blue-500/20 text-blue-400',
  purple: 'bg-purple-500/20 text-purple-400',
}

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2 py-1',
}

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  )
}

// Status-specific badges
interface StatusBadgeProps {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variantMap: Record<typeof status, BadgeVariant> = {
    pending: 'default',
    running: 'purple',
    completed: 'success',
    failed: 'error',
    skipped: 'warning',
  }

  const labelMap: Record<typeof status, string> = {
    pending: 'Pending',
    running: 'Running',
    completed: 'Completed',
    failed: 'Failed',
    skipped: 'Skipped',
  }

  return (
    <Badge variant={variantMap[status]} className={className}>
      {labelMap[status]}
    </Badge>
  )
}
