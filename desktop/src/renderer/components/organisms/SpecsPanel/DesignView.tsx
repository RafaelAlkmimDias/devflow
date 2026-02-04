import { useCallback, useRef } from 'react';
import { Cpu } from 'lucide-react';
import { useSpecsStore } from '@/lib/stores/specsStore';
import { useListNavigation } from '@/hooks/useListNavigation';
import type { DesignDecision, Spec } from '@/lib/types';
import { EmptyState } from './EmptyState';
import { DecisionCard } from './DecisionCard';

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

  const handleSelect = useCallback((dec: DesignDecision) => {
    const spec = specs.find(s => s.id === dec.specId);
    if (spec) {
      onOpenSpec(spec);
    }
  }, [specs, onOpenSpec]);

  const { handleKeyDown, isSelected } = useListNavigation({
    items: decisions,
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
    <div
      ref={containerRef}
      className="space-y-2 sm:space-y-3 focus:outline-none"
      role="listbox"
      aria-label="Design decisions list"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {decisions.map((dec, index) => {
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
  );
}
