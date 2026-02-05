import { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
  shimmer?: boolean;
}

export function Skeleton({ className, style, shimmer = true }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-md bg-white/5',
        shimmer ? 'skeleton-shimmer' : 'animate-pulse',
        className
      )}
      style={style}
    />
  );
}

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            i === lines - 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  );
}

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div className={cn('p-4 rounded-lg border border-white/10 bg-white/5', className)}>
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="w-8 h-8 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-1/3 mb-1" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

interface SkeletonListProps {
  items?: number;
  className?: string;
}

export function SkeletonList({ items = 5, className }: SkeletonListProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 p-2">
          <Skeleton className="w-4 h-4" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  );
}

interface SkeletonTreeProps {
  depth?: number;
  items?: number;
  className?: string;
}

export function SkeletonTree({ depth = 2, items = 5, className }: SkeletonTreeProps) {
  const renderItems = (level: number, count: number): JSX.Element[] => {
    return Array.from({ length: count }).map((_, i) => (
      <div key={`${level}-${i}`}>
        <div
          className="flex items-center gap-2 py-1"
          style={{ paddingLeft: level * 16 }}
        >
          <Skeleton className="w-4 h-4" />
          <Skeleton className={cn('h-4', i % 3 === 0 ? 'w-24' : i % 2 === 0 ? 'w-32' : 'w-20')} />
        </div>
        {level < depth && i % 2 === 0 && renderItems(level + 1, 2)}
      </div>
    ));
  };

  return (
    <div className={cn('space-y-1', className)}>
      {renderItems(0, items)}
    </div>
  );
}

// Skeleton específico para cards de task
export function SkeletonTaskCard({ className }: { className?: string }) {
  return (
    <div className={cn('p-3 rounded-lg border border-white/10 bg-white/5', className)}>
      <div className="flex items-start gap-3">
        <Skeleton className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="w-2 h-2 rounded-full" />
            <Skeleton className="h-4 flex-1 max-w-[200px]" />
          </div>
          <Skeleton className="h-3 w-3/4" />
          <div className="flex gap-2 mt-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Skeleton específico para lista de specs
export function SkeletonSpecsList({ items = 3, className }: { items?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonTaskCard key={i} />
      ))}
    </div>
  );
}

// Skeleton para stat cards do dashboard
export function SkeletonStatCard({ className }: { className?: string }) {
  return (
    <div className={cn('p-4 rounded-lg border border-white/10 bg-[#1a1a24]', className)}>
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="w-9 h-9 rounded-lg" />
        <Skeleton className="w-12 h-8" />
      </div>
      <Skeleton className="h-4 w-20 mb-1" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

// Skeleton para chat output
export function SkeletonChatMessage({ isUser = false, className }: { isUser?: boolean; className?: string }) {
  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row', className)}>
      <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
      <div className={cn('flex-1 max-w-[85%] rounded-xl p-4', isUser ? 'ml-auto' : '')}>
        <Skeleton className="h-3 w-16 mb-2" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    </div>
  );
}
