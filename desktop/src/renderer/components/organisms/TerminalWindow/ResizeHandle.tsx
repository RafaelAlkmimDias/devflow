import { cn } from '@/lib/utils';

interface ResizeHandleProps {
  isResizing: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
}

export function ResizeHandle({ isResizing, onMouseDown }: ResizeHandleProps) {
  return (
    <div
      className={cn(
        'h-1 cursor-row-resize group flex items-center justify-center',
        'hover:bg-purple-500/30 transition-colors',
        isResizing && 'bg-purple-500/50'
      )}
      onMouseDown={onMouseDown}
    >
      <div
        className={cn(
          'w-12 h-0.5 rounded-full bg-white/20 group-hover:bg-purple-400/50 transition-colors',
          isResizing && 'bg-purple-400'
        )}
      />
    </div>
  );
}
