import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface IconProps {
  icon: LucideIcon
  size?: IconSize
  className?: string
}

const sizeStyles: Record<IconSize, string> = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
}

export function Icon({ icon: IconComponent, size = 'md', className }: IconProps) {
  return <IconComponent className={cn(sizeStyles[size], className)} />
}

// Common icon wrapper with hover effect
interface IconWrapperProps {
  children: React.ReactNode
  className?: string
  active?: boolean
  onClick?: () => void
}

export function IconWrapper({ children, className, active, onClick }: IconWrapperProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded transition-colors',
        onClick && 'cursor-pointer hover:bg-white/10',
        active && 'bg-white/10 text-white',
        className
      )}
      onClick={onClick}
    >
      {children}
    </span>
  )
}
