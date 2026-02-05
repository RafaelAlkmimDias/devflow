import { useEffect, useState } from 'react';
import { FileText, Cpu, ListTodo, Plus, Sparkles, RefreshCw } from 'lucide-react';
import type { SpecPhase, Spec } from '@/lib/types';
import { useSpecsStore } from '@/lib/stores/specsStore';
import { useFileStore } from '@/lib/stores/fileStore';
import { useAutopilotStore } from '@/lib/stores/autopilotStore';
import { cn } from '@/lib/utils';
import { SkeletonSpecsList } from '@/components/atoms/Skeleton';
import { RequirementsView } from './RequirementsView';
import { DesignView } from './DesignView';
import { TasksView } from './TasksView';
import { CreateSpecModal } from './CreateSpecModal';

interface SpecsPanelProps {
  projectPath: string;
}

const PHASES: { id: SpecPhase; name: string; icon: React.ReactNode; color: string }[] = [
  { id: 'requirements', name: 'Requirements', icon: <FileText className="w-4 h-4" />, color: 'text-blue-400' },
  { id: 'design', name: 'Design', icon: <Cpu className="w-4 h-4" />, color: 'text-purple-400' },
  { id: 'tasks', name: 'Tasks', icon: <ListTodo className="w-4 h-4" />, color: 'text-amber-400' },
];

export function SpecsPanel({ projectPath }: SpecsPanelProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const {
    specs,
    requirements,
    decisions,
    tasks,
    isLoading,
    error,
    activePhase,
    loadSpecs,
    setActivePhase,
  } = useSpecsStore();

  const { openFile } = useFileStore();
  const { status: autopilotStatus } = useAutopilotStore();

  // Load specs when project path changes
  useEffect(() => {
    if (projectPath) {
      loadSpecs(projectPath);
    }
  }, [projectPath, loadSpecs]);

  // Refresh specs when autopilot completes
  useEffect(() => {
    if (autopilotStatus === 'completed' || autopilotStatus === 'failed') {
      const timer = setTimeout(() => {
        loadSpecs(projectPath);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [autopilotStatus, projectPath, loadSpecs]);

  const handleOpenSpec = (spec: Spec) => {
    if (spec.filePath) {
      openFile(spec.filePath);
    }
  };

  // Filter by phase
  const requirementSpecs = specs.filter(s => s.phase === 'requirements');
  const designSpecs = specs.filter(s => s.phase === 'design');

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-white/10">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <h2 className="font-semibold flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
            <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0" aria-hidden="true" />
            <span className="truncate">Specs</span>
          </h2>
          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0" role="toolbar" aria-label="Specs actions">
            <button
              onClick={() => loadSpecs(projectPath)}
              className="p-1 sm:p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
              title="Refresh"
              aria-label="Refresh specs"
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} aria-hidden="true" />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-1 sm:p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
              title="New Spec"
              aria-label="Create new spec"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Phase Tabs */}
        <div
          className="flex gap-1 bg-white/5 rounded-lg p-1 overflow-x-auto scrollbar-hide"
          role="tablist"
          aria-label="Spec phases"
        >
          {PHASES.map((phase) => {
            const count = phase.id === 'requirements'
              ? requirements.length
              : phase.id === 'design'
              ? decisions.length
              : tasks.length;

            return (
              <button
                key={phase.id}
                onClick={() => setActivePhase(phase.id)}
                role="tab"
                aria-selected={activePhase === phase.id}
                aria-controls={`${phase.id}-panel`}
                id={`${phase.id}-tab`}
                className={cn(
                  'flex-1 min-w-0 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap',
                  activePhase === phase.id
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                )}
              >
                <span className={cn('flex-shrink-0', phase.color)} aria-hidden="true">{phase.icon}</span>
                <span className="hidden sm:inline truncate">{phase.name}</span>
                {count > 0 && (
                  <span className="flex-shrink-0 px-1.5 py-0.5 bg-white/10 rounded text-[10px]" aria-label={`${count} items`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-3 sm:mx-4 mt-2 sm:mt-3 p-2 sm:p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs sm:text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Content */}
      <div
        className="flex-1 overflow-auto p-3 sm:p-4"
        role="tabpanel"
        id={`${activePhase}-panel`}
        aria-labelledby={`${activePhase}-tab`}
      >
        {isLoading ? (
          <div aria-label="Loading specs">
            <SkeletonSpecsList items={4} />
          </div>
        ) : (
          <>
            {activePhase === 'requirements' && (
              <RequirementsView
                requirements={requirements}
                specs={requirementSpecs}
                projectPath={projectPath}
                onOpenSpec={handleOpenSpec}
                onCreateNew={() => setShowCreateModal(true)}
              />
            )}
            {activePhase === 'design' && (
              <DesignView
                decisions={decisions}
                specs={designSpecs}
                onOpenSpec={handleOpenSpec}
                onCreateNew={() => setShowCreateModal(true)}
              />
            )}
            {activePhase === 'tasks' && (
              <TasksView
                tasks={tasks}
                onCreateNew={() => setShowCreateModal(true)}
              />
            )}
          </>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateSpecModal
          projectPath={projectPath}
          activePhase={activePhase}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
