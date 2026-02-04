import type { GitStatus, GitCommit, GitBranches } from '@shared/types'

/**
 * Git operations API
 */
export const gitApi = {
  getStatus: (repoPath: string): Promise<GitStatus> => {
    return window.electronAPI.gitStatus(repoPath)
  },

  stage: (repoPath: string, files: string[]): Promise<void> => {
    return window.electronAPI.gitStage(repoPath, files)
  },

  unstage: (repoPath: string, files: string[]): Promise<void> => {
    return window.electronAPI.gitUnstage(repoPath, files)
  },

  commit: (repoPath: string, message: string): Promise<void> => {
    return window.electronAPI.gitCommit(repoPath, message)
  },

  getLog: (repoPath: string, limit?: number): Promise<GitCommit[]> => {
    return window.electronAPI.gitLog(repoPath, limit)
  },

  getDiff: (repoPath: string, file?: string): Promise<string> => {
    return window.electronAPI.gitDiff(repoPath, file)
  },

  getBranches: (repoPath: string): Promise<GitBranches> => {
    return window.electronAPI.gitBranches(repoPath)
  },

  checkout: (repoPath: string, branch: string): Promise<void> => {
    return window.electronAPI.gitCheckout(repoPath, branch)
  },

  createBranch: (repoPath: string, branch: string): Promise<void> => {
    return window.electronAPI.gitCreateBranch(repoPath, branch)
  },

  pull: (repoPath: string): Promise<void> => {
    return window.electronAPI.gitPull(repoPath)
  },

  push: (repoPath: string): Promise<void> => {
    return window.electronAPI.gitPush(repoPath)
  },

  discard: (repoPath: string, files: string[]): Promise<void> => {
    return window.electronAPI.gitDiscard(repoPath, files)
  },

  init: (repoPath: string): Promise<void> => {
    return window.electronAPI.gitInit(repoPath)
  },

  isRepo: (repoPath: string): Promise<boolean> => {
    return window.electronAPI.gitIsRepo(repoPath)
  },
}
