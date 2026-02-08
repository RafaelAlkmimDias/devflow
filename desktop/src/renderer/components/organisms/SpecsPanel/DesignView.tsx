import { useCallback, useMemo, useRef, useState } from 'react';
import { Cpu } from 'lucide-react';
import { useSpecsStore } from '@/lib/stores/specsStore';
import { useListNavigation } from '@/hooks/useListNavigation';
import type { DesignDecision, Spec } from '@/lib/types';
import { EmptyState } from './EmptyState';
import { DecisionCard } from './DecisionCard';
import { StatusFilterTabs, type StatusFilter } from './StatusFilterTabs';

interface DesignViewProps {
  decisions: DesignDecision[];
  specs: Spec[];
  onOpenSpec: (spec: Spec) => void;
  onCreateNew: () => void;
}

export function DesignView({
  decisions,
  specs,
  onOpenSpec,
  onCreateNew,
}: DesignViewProps) {
  const { getSpecProgress } = useSpecsStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');

  const { pendingDecs, completedDecs, blockedDecs } = useMemo(() => {
    const pending: DesignDecision[] = [];
    const completed: DesignDecision[] = [];
    const blocked: DesignDecision[] = [];
    for (const dec of decisions) {
      const progress = getSpecProgress(dec.specId);
      if (progress.status === 'completed') {
        completed.push(dec);
      } else if (progress.total > 0 && progress.blocked === progress.total) {
        blocked.push(dec);
      } else {
        pending.push(dec);
      }
    }
    return { pendingDecs: pending, completedDecs: completed, blockedDecs: blocked };
  }, [decisions, getSpecProgress]);

  const filteredDecisions = statusFilter === 'pending'
    ? pendingDecs
    : statusFilter === 'completed'
      ? completedDecs
      : blockedDecs;

  const handleSelect = useCallback((dec: DesignDecision) => {
    const spec = specs.find(s => s.id === dec.specId);
    if (spec) {
      onOpenSpec(spec);
    }
  }, [specs, onOpenSpec]);

  const { handleKeyDown, isSelected } = useListNavigation({
    items: filteredDecisions,
    onSelect: handleSelect,
    getItemText: (dec) => dec.title,
    typeAhead: true,
  });

  if (decisions.length === 0) {
    return (
      <EmptyState
        icon={<Cpu className="w-8 h-8" />}
        title="No Design Decisions"
        description="Create Architecture Decision Records (ADRs) to document technical choices."
        action="Create ADR"
        onAction={onCreateNew}
      />
    );
  }

  return (
    <div>
      <StatusFilterTabs
        active={statusFilter}
        onChange={setStatusFilter}
        pendingCount={pendingDecs.length}
        completedCount={completedDecs.length}
        blockedCount={blockedDecs.length}
      />

      {filteredDecisions.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          {statusFilter === 'pending' && 'Nenhuma decisão pendente'}
          {statusFilter === 'completed' && 'Nenhuma decisão concluída'}
          {statusFilter === 'blocked' && 'Nenhuma decisão bloqueada'}
        </div>
      ) : (
        <div
          ref={containerRef}
          className="space-y-2 sm:space-y-3 focus:outline-none"
          role="listbox"
          aria-label="Design decisions list"
          tabIndex={0}
          onKeyDown={handleKeyDown}
        >
          {filteredDecisions.map((dec, index) => {
            const spec = specs.find(s => s.id === dec.specId);
            const progress = getSpecProgress(dec.specId);
            return (
              <DecisionCard
                key={dec.id}
                decision={dec}
                spec={spec}
                progress={progress}
                onClick={() => spec && onOpenSpec(spec)}
                isSelected={isSelected(index)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
