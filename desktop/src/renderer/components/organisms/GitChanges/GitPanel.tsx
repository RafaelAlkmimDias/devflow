import { useEffect, useState, useCallback } from 'react';
import { useGitStore } from '@/lib/stores/gitStore';
import { cn } from '@/lib/utils';
import { GitBranch, RefreshCw, Check, X, AlertCircle } from 'lucide-react';
import { NoRepoView } from './NoRepoView';
import { BranchSelector } from './BranchSelector';
import { FileChangesList } from './FileChangesList';
import { CommitSection } from './CommitSection';
import type { FileStatus } from './fileStatusUtils';

interface GitPanelProps {
  projectPath: string;
}

export function GitPanel({ projectPath }: GitPanelProps) {
  const {
    status,
    branches,
    isLoading,
    error,
    isRepo,
    fetchStatus,
    fetchBranches,
    stageFiles,
    unstageFiles,
    commit,
    push,
    pull,
    checkout,
    createBranch,
    discardChanges,
    initRepo,
    setError,
  } = useGitStore();

  const [commitMessage, setCommitMessage] = useState('');

  // Fetch status on mount and set up polling
  useEffect(() => {
    fetchStatus(projectPath);
    fetchBranches(projectPath);

    const interval = setInterval(() => {
      fetchStatus(projectPath);
    }, 5000);

    return () => clearInterval(interval);
  }, [projectPath, fetchStatus, fetchBranches]);

  const handleRefresh = useCallback(() => {
    fetchStatus(projectPath);
    fetchBranches(projectPath);
  }, [projectPath, fetchStatus, fetchBranches]);

  const handleCommit = useCallback(async () => {
    if (!commitMessage.trim()) return;

    const result = await commit(projectPath, commitMessage);
    if (result.success) {
      setCommitMessage('');
    }
  }, [projectPath, commitMessage, commit]);

  const handleStageFiles = useCallback((files: string[]) => {
    stageFiles(projectPath, files);
  }, [projectPath, stageFiles]);

  const handleUnstageFiles = useCallback((files: string[]) => {
    unstageFiles(projectPath, files);
  }, [projectPath, unstageFiles]);

  const handleDiscardChanges = useCallback((files: string[]) => {
    discardChanges(projectPath, files);
  }, [projectPath, discardChanges]);

  const handleCheckout = useCallback(async (branch: string) => {
    await checkout(projectPath, branch);
  }, [projectPath, checkout]);

  const handleCreateBranch = useCallback(async (name: string) => {
    return await createBranch(projectPath, name);
  }, [projectPath, createBranch]);

  const handleInit = useCallback(() => {
    initRepo(projectPath);
  }, [projectPath, initRepo]);

  // Not a git repo
  if (isRepo === false) {
    return <NoRepoView isLoading={isLoading} onInit={handleInit} />;
  }

  // Compute file lists from status
  const stagedFiles = status?.staged || [];
  const modifiedFiles = status?.modified || [];
  const deletedFiles = status?.deleted || [];
  const untrackedFiles = status?.not_added || [];

  // Combine modified and deleted as "unstaged changes"
  const unstagedFiles = [
    ...modifiedFiles.map((f) => ({ path: f, status: 'modified' as FileStatus })),
    ...deletedFiles.map((f) => ({ path: f, status: 'deleted' as FileStatus })),
  ];

  const totalChanges = stagedFiles.length + unstagedFiles.length + untrackedFiles.length;

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f]">
      {/* Header */}
      <div className="p-3 border-b border-white/10">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Source Control
            {totalChanges > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded">
                {totalChanges}
              </span>
            )}
          </h2>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </button>
        </div>

        <BranchSelector
          currentBranch={status?.current || 'main'}
          branches={branches}
          ahead={status?.ahead}
          behind={status?.behind}
          onCheckout={handleCheckout}
          onCreateBranch={handleCreateBranch}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-3 mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-xs text-red-400 flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Changes */}
      <div className="flex-1 overflow-y-auto">
        <FileChangesList
          title="Staged Changes"
          titleColor="text-green-400"
          files={stagedFiles.map(f => ({ path: f, status: 'added' as FileStatus }))}
                    onUnstage={handleUnstageFiles}
          showUnstageAll
        />

        <FileChangesList
          title="Changes"
          titleColor="text-yellow-400"
          files={unstagedFiles}
                    onStage={handleStageFiles}
          onDiscard={handleDiscardChanges}
          showStageAll
          showDiscardAll
        />

        <FileChangesList
          title="Untracked"
          titleColor="text-gray-400"
          files={untrackedFiles}
                    onStage={handleStageFiles}
          showStageAll
          isUntracked
        />

        {/* No Changes */}
        {totalChanges === 0 && isRepo && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Check className="w-8 h-8 text-green-400 mb-2" />
            <p className="text-sm text-gray-400">No changes</p>
            <p className="text-xs text-gray-600">Working tree clean</p>
          </div>
        )}
      </div>

      {/* Commit Section */}
      {isRepo && (
        <CommitSection
          commitMessage={commitMessage}
          onCommitMessageChange={setCommitMessage}
          onCommit={handleCommit}
          onPush={() => push(projectPath)}
          onPull={() => pull(projectPath)}
          canCommit={!!commitMessage.trim() && stagedFiles.length > 0}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
