import { cn } from '@/lib/utils';

export type StatusFilter = 'pending' | 'completed' | 'blocked';

interface StatusFilterTabsProps {
  active: StatusFilter;
  onChange: (filter: StatusFilter) => void;
  pendingCount: number;
  completedCount: number;
  blockedCount?: number;
}

export function StatusFilterTabs({ active, onChange, pendingCount, completedCount, blockedCount = 0 }: StatusFilterTabsProps) {
  return (
    <div className="flex gap-1 bg-white/5 rounded-md p-0.5 mb-3" role="tablist" aria-label="Status filter">
      <button
        onClick={() => onChange('pending')}
        role="tab"
        aria-selected={active === 'pending'}
        className={cn(
          'flex-1 flex items-center justify-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all',
          active === 'pending'
            ? 'bg-white/10 text-white'
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        )}
      >
        Pendentes
        {pendingCount > 0 && (
          <span className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">{pendingCount}</span>
        )}
      </button>
      <button
        onClick={() => onChange('completed')}
        role="tab"
        aria-selected={active === 'completed'}
        className={cn(
          'flex-1 flex items-center justify-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all',
          active === 'completed'
            ? 'bg-green-500/15 text-green-400'
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        )}
      >
        Concluídos
        {completedCount > 0 && (
          <span className="px-1.5 py-0.5 bg-green-500/10 rounded text-[10px]">{completedCount}</span>
        )}
      </button>
      {blockedCount > 0 && (
        <button
          onClick={() => onChange('blocked')}
          role="tab"
          aria-selected={active === 'blocked'}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all',
            active === 'blocked'
              ? 'bg-red-500/15 text-red-400'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          )}
        >
          Bloqueados
          <span className="px-1.5 py-0.5 bg-red-500/10 rounded text-[10px]">{blockedCount}</span>
        </button>
      )}
    </div>
  );
}
