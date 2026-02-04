import { useCallback } from 'react'
import { gitApi } from '@/infrastructure/api'
import type { GitStatus, GitCommit, GitBranches } from '@shared/types'

/**
 * Hook for Git operations.
 * Provides methods for git status, staging, committing, and branch management.
 */
export function useGitOperations() {
  const getStatus = useCallback(async (repoPath: string): Promise<GitStatus> => {
    return gitApi.getStatus(repoPath)
  }, [])

  const stage = useCallback(async (repoPath: string, files: string[]): Promise<void> => {
    return gitApi.stage(repoPath, files)
  }, [])

  const unstage = useCallback(async (repoPath: string, files: string[]): Promise<void> => {
    return gitApi.unstage(repoPath, files)
  }, [])

  const commit = useCallback(async (repoPath: string, message: string): Promise<void> => {
    return gitApi.commit(repoPath, message)
  }, [])

  const getLog = useCallback(async (repoPath: string, limit?: number): Promise<GitCommit[]> => {
    return gitApi.getLog(repoPath, limit)
  }, [])

  const getDiff = useCallback(async (repoPath: string, file?: string): Promise<string> => {
    return gitApi.getDiff(repoPath, file)
  }, [])

  const getBranches = useCallback(async (repoPath: string): Promise<GitBranches> => {
    return gitApi.getBranches(repoPath)
  }, [])

  const checkout = useCallback(async (repoPath: string, branch: string): Promise<void> => {
    return gitApi.checkout(repoPath, branch)
  }, [])

  const createBranch = useCallback(async (repoPath: string, branch: string): Promise<void> => {
    return gitApi.createBranch(repoPath, branch)
  }, [])

  const pull = useCallback(async (repoPath: string): Promise<void> => {
    return gitApi.pull(repoPath)
  }, [])

  const push = useCallback(async (repoPath: string): Promise<void> => {
    return gitApi.push(repoPath)
  }, [])

  const discard = useCallback(async (repoPath: string, files: string[]): Promise<void> => {
    return gitApi.discard(repoPath, files)
  }, [])

  const init = useCallback(async (repoPath: string): Promise<void> => {
    return gitApi.init(repoPath)
  }, [])

  const isRepo = useCallback(async (repoPath: string): Promise<boolean> => {
    return gitApi.isRepo(repoPath)
  }, [])

  return {
    getStatus,
    stage,
    unstage,
    commit,
    getLog,
    getDiff,
    getBranches,
    checkout,
    createBranch,
    pull,
    push,
    discard,
    init,
    isRepo,
  }
}
