import { useCallback, useRef } from 'react';
import { FileText } from 'lucide-react';
import { useSpecsStore } from '@/lib/stores/specsStore';
import { useListNavigation } from '@/hooks/useListNavigation';
import type { Requirement, Spec } from '@/lib/types';
import { EmptyState } from './EmptyState';
import { RequirementCard } from './RequirementCard';

interface RequirementsViewProps {
  requirements: Requirement[];
  specs: Spec[];
  projectPath: string;
  onOpenSpec: (spec: Spec) => void;
  onCreateNew: () => void;
}

export function RequirementsView({
  requirements,
  specs,
  projectPath,
  onOpenSpec,
  onCreateNew,
}: RequirementsViewProps) {
  const { getSpecProgress } = useSpecsStore();
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSelect = useCallback((req: Requirement) => {
    const spec = specs.find(s => s.id === req.specId);
    if (spec) {
      onOpenSpec(spec);
    }
  }, [specs, onOpenSpec]);

  const { handleKeyDown, isSelected } = useListNavigation({
    items: requirements,
    onSelect: handleSelect,
    getItemText: (req) => req.title,
    typeAhead: true,
  });

  if (requirements.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="w-8 h-8" />}
        title="No Requirements Yet"
        description="Start by describing what you want to build. Create user stories with acceptance criteria."
        action="Create Requirement"
        onAction={onCreateNew}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="space-y-2 sm:space-y-3 focus:outline-none"
      role="listbox"
      aria-label="Requirements list"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {requirements.map((req, index) => {
        const spec = specs.find(s => s.id === req.specId);
        const progress = getSpecProgress(req.specId);
        return (
          <RequirementCard
            key={req.id}
            requirement={req}
            spec={spec}
            progress={progress}
            projectPath={projectPath}
            onClick={() => spec && onOpenSpec(spec)}
            isSelected={isSelected(index)}
          />
        );
      })}
    </div>
  );
}
