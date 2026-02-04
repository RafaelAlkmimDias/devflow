import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Minus, RotateCcw, FilePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getFileStatusIcon, getFileStatusBadge, type FileStatus } from './fileStatusUtils';

interface FileWithStatus {
  path: string;
  status: FileStatus;
}

interface FileChangesListProps {
  title: string;
  titleColor: string;
  files: string[] | FileWithStatus[];
  onStage?: (files: string[]) => void;
  onUnstage?: (files: string[]) => void;
  onDiscard?: (files: string[]) => void;
  showStageAll?: boolean;
  showUnstageAll?: boolean;
  showDiscardAll?: boolean;
  isUntracked?: boolean;
}

function isFileWithStatus(file: string | FileWithStatus): file is FileWithStatus {
  return typeof file === 'object' && 'path' in file;
}

export function FileChangesList({
  title,
  titleColor,
  files,
  onStage,
  onUnstage,
  onDiscard,
  showStageAll = false,
  showUnstageAll = false,
  showDiscardAll = false,
  isUntracked = false,
}: FileChangesListProps) {
  const [expanded, setExpanded] = useState(true);

  if (files.length === 0) return null;

  const filePaths = files.map(f => isFileWithStatus(f) ? f.path : f);

  return (
    <div className="border-b border-white/5">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => e.key === 'Enter' && setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
          <span className={cn('text-xs font-medium', titleColor)}>{title}</span>
          <span className="text-xs text-gray-500">{files.length}</span>
        </div>
        <div className="flex gap-1">
          {showDiscardAll && onDiscard && (
            <button
              onClick={(e) => { e.stopPropagation(); onDiscard(filePaths); }}
              className="p-1 text-gray-400 hover:text-red-400 hover:bg-white/10 rounded"
              title="Discard All"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
          {showStageAll && onStage && (
            <button
              onClick={(e) => { e.stopPropagation(); onStage(filePaths); }}
              className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded"
              title="Stage All"
            >
              <Plus className="w-3 h-3" />
            </button>
          )}
          {showUnstageAll && onUnstage && (
            <button
              onClick={(e) => { e.stopPropagation(); onUnstage(filePaths); }}
              className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded"
              title="Unstage All"
            >
              <Minus className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="pb-2">
          {files.map((file) => {
            const filePath = isFileWithStatus(file) ? file.path : file;
            const status = isFileWithStatus(file) ? file.status : 'added';

            return (
              <div
                key={filePath}
                className="group flex items-center gap-2 px-3 py-1 hover:bg-white/5 transition-colors"
              >
                {isUntracked ? (
                  <FilePlus className="w-4 h-4 text-green-400" />
                ) : (
                  getFileStatusIcon(status)
                )}
                <span className="flex-1 text-xs text-gray-300 truncate" title={filePath}>
                  {filePath}
                </span>
                {isUntracked ? (
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded text-green-400 bg-green-400/10">U</span>
                ) : (
                  getFileStatusBadge(status)
                )}
                {onDiscard && (
                  <button
                    onClick={() => onDiscard([filePath])}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-400 hover:bg-white/10 rounded transition-opacity"
                    title="Discard"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
                {onStage && (
                  <button
                    onClick={() => onStage([filePath])}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-opacity"
                    title="Stage"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
                {onUnstage && (
                  <button
                    onClick={() => onUnstage([filePath])}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-opacity"
                    title="Unstage"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
