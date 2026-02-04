import { useCallback, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  Loader2,
  Rocket,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAutopilotStore } from '@/lib/stores/autopilotStore';
import { useSpecsStore, type SpecProgress } from '@/lib/stores/specsStore';
import type { Requirement, Spec } from '@/lib/types';
import { ExpandableTaskList } from './ExpandableTaskList';

interface RequirementCardProps {
  requirement: Requirement;
  spec?: Spec;
  progress: SpecProgress;
  projectPath: string;
  onClick: () => void;
  isSelected?: boolean;
}

const priorityColors = {
  must: 'bg-red-500/20 text-red-400 border-red-500/30',
  should: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  could: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  wont: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export function RequirementCard({
  requirement,
  spec,
  progress,
  projectPath: _projectPath,
  onClick,
  isSelected = false,
}: RequirementCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSelected && cardRef.current) {
      cardRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isSelected]);

  const { openConfigModal, status: autopilotStatus, specId: autopilotSpecId } = useAutopilotStore();
  const { specs: allSpecs, getSpecProgress, getTasksBySpec } = useSpecsStore();
  const specTasks = spec ? getTasksBySpec(spec.id) : [];

  const getDependencyStatus = useCallback((code: string): 'completed' | 'in_progress' | 'not_found' => {
    const normalizedCode = code.trim().toLowerCase();
    const matchingSpec = allSpecs.find(s => s.id.toLowerCase().startsWith(normalizedCode));
    if (!matchingSpec) return 'not_found';
    const p = getSpecProgress(matchingSpec.id);
    return p.status === 'completed' ? 'completed' : p.status === 'in_progress' ? 'in_progress' : 'not_found';
  }, [allSpecs, getSpecProgress]);

  const getStatusIcon = () => {
    if (progress.status === 'completed') {
      return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    }
    if (progress.status === 'in_progress') {
      return <Clock className="w-4 h-4 text-blue-400" />;
    }
    if (requirement.status === 'approved') {
      return <CheckCircle2 className="w-4 h-4 text-amber-400" />;
    }
    return <Circle className="w-4 h-4 text-gray-400" />;
  };

  const getBorderClass = () => {
    if (progress.status === 'completed') return 'border-green-500/30 bg-green-500/5';
    if (progress.status === 'in_progress') return 'border-blue-500/30 bg-blue-500/5';
    return 'border-white/10';
  };

  const handleAutopilotClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (spec) {
      const specContent = `# ${requirement.title}\n\n${requirement.description}\n\n## Acceptance Criteria\n${requirement.acceptanceCriteria.map(c => `- ${c}`).join('\n')}`;
      openConfigModal(spec.id, requirement.title, specContent);
    }
  };

  const isAutopilotRunning = autopilotStatus === 'running' && autopilotSpecId === spec?.id;

  const renderDescription = () => {
    return requirement.description.split('\n').map((line, lineIdx) => {
      const depMatch = line.match(/^\*\*Depend[êe]ncias:\*\*\s*(.+)$/i);
      if (depMatch) {
        const depsText = depMatch[1].trim();
        const isNone = /^nenhuma\b/i.test(depsText);
        if (isNone) {
          return (
            <span key={lineIdx}>
              <strong className="font-bold text-gray-200">Dependências:</strong>{' '}
              <span title="Sem dependências">✅ Nenhuma</span>
              {lineIdx < requirement.description.split('\n').length - 1 && '\n'}
            </span>
          );
        }
        const deps = depsText.split(',').map(d => d.trim());
        return (
          <span key={lineIdx}>
            <strong className="font-bold text-gray-200">Dependências:</strong>{' '}
            {deps.map((dep, depIdx) => {
              const codeMatch = dep.match(/^(US-\d+|ADR-\d+|EPIC-\d+)/i);
              const code = codeMatch?.[1] || '';
              const status = code ? getDependencyStatus(code) : 'not_found';
              const icon = status === 'completed' ? '✅' : status === 'in_progress' ? '⏳' : '❌';
              return (
                <span key={depIdx}>
                  {depIdx > 0 && ', '}
                  <span title={status === 'completed' ? 'Concluída' : status === 'in_progress' ? 'Em andamento' : 'Não encontrada'}>
                    {icon} {dep}
                  </span>
                </span>
              );
            })}
            {lineIdx < requirement.description.split('\n').length - 1 && '\n'}
          </span>
        );
      }
      return (
        <span key={lineIdx}>
          {line.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
            part.startsWith('**') && part.endsWith('**')
              ? <strong key={i} className="font-bold text-gray-200">{part.slice(2, -2)}</strong>
              : part
          )}
          {lineIdx < requirement.description.split('\n').length - 1 && '\n'}
        </span>
      );
    });
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      className={cn(
        'p-2 sm:p-3 bg-white/5 border rounded-lg hover:border-purple-500/30 hover:bg-white/[0.07] transition-all cursor-pointer group',
        getBorderClass(),
        isSelected && 'ring-1 ring-inset ring-purple-500/50'
      )}
      role="option"
      aria-selected={isSelected}
      tabIndex={isSelected ? 0 : -1}
    >
      <div className="flex items-start gap-2 sm:gap-3">
        <div className="flex-shrink-0 mt-0.5" aria-hidden="true">
          {getStatusIcon()}
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-start sm:items-center gap-1 sm:gap-2 mb-1 flex-wrap">
            <span className="font-medium text-sm text-white break-words">{requirement.title}</span>
            <span className={cn(
              'flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium border',
              priorityColors[requirement.priority]
            )}>
              {requirement.priority.toUpperCase()}
            </span>
            {progress.status === 'completed' && (
              <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                DONE
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 line-clamp-10 break-words whitespace-pre-line">
            {renderDescription()}
          </p>

          <ExpandableTaskList
            tasks={specTasks}
            spec={spec}
            progress={progress}
            parentTitle={requirement.title}
            parentContext={requirement.description}
          />

          {progress.status !== 'completed' && spec && (
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={handleAutopilotClick}
                disabled={!!isAutopilotRunning}
                aria-label={isAutopilotRunning ? 'Autopilot running' : 'Start Autopilot'}
                className={cn(
                  'flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-all',
                  isAutopilotRunning
                    ? 'bg-purple-500/20 text-purple-400 cursor-wait'
                    : 'bg-white/10 text-gray-400 hover:bg-purple-500/20 hover:text-purple-400 opacity-0 group-hover:opacity-100'
                )}
              >
                {isAutopilotRunning ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                    Running...
                  </>
                ) : (
                  <>
                    <Rocket className="w-3 h-3" aria-hidden="true" />
                    Autopilot
                  </>
                )}
              </button>
            </div>
          )}

          {requirement.acceptanceCriteria.length > 0 && progress.total === 0 && !spec && (
            <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
              <CheckCircle2 className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
              <span className="truncate">{requirement.acceptanceCriteria.length} criteria</span>
            </div>
          )}
        </div>
        <ExternalLink className="w-4 h-4 flex-shrink-0 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" aria-hidden="true" />
      </div>
    </div>
  );
}
