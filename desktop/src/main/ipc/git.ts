import { ipcMain } from 'electron'
import { GitStatus, GitCommit, GitBranches } from '../../shared/types'
import { gitService } from '../application/GitService'

/**
 * Register IPC handlers for Git operations.
 * Handlers delegate to GitService for actual operations.
 */
export function registerGitHandlers(): void {
  // Get repository status
  ipcMain.handle('git:status', async (_, repoPath: string): Promise<GitStatus> => {
    return gitService.getStatus(repoPath)
  })

  // Stage files
  ipcMain.handle('git:stage', async (_, repoPath: string, files: string[]): Promise<void> => {
    return gitService.stage(repoPath, files)
  })

  // Unstage files
  ipcMain.handle('git:unstage', async (_, repoPath: string, files: string[]): Promise<void> => {
    return gitService.unstage(repoPath, files)
  })

  // Commit changes
  ipcMain.handle('git:commit', async (_, repoPath: string, message: string): Promise<void> => {
    return gitService.commit(repoPath, message)
  })

  // Get commit log
  ipcMain.handle('git:log', async (_, repoPath: string, limit: number = 50): Promise<GitCommit[]> => {
    return gitService.getLog(repoPath, limit)
  })

  // Get diff
  ipcMain.handle('git:diff', async (_, repoPath: string, file?: string): Promise<string> => {
    return gitService.getDiff(repoPath, file)
  })

  // Get branches
  ipcMain.handle('git:branches', async (_, repoPath: string): Promise<GitBranches> => {
    return gitService.getBranches(repoPath)
  })

  // Checkout branch
  ipcMain.handle('git:checkout', async (_, repoPath: string, branch: string): Promise<void> => {
    return gitService.checkout(repoPath, branch)
  })

  // Create and checkout new branch
  ipcMain.handle('git:createBranch', async (_, repoPath: string, branch: string): Promise<void> => {
    return gitService.createBranch(repoPath, branch)
  })

  // Pull from remote
  ipcMain.handle('git:pull', async (_, repoPath: string): Promise<void> => {
    return gitService.pull(repoPath)
  })

  // Push to remote
  ipcMain.handle('git:push', async (_, repoPath: string): Promise<void> => {
    return gitService.push(repoPath)
  })

  // Discard changes in files
  ipcMain.handle('git:discard', async (_, repoPath: string, files: string[]): Promise<void> => {
    return gitService.discard(repoPath, files)
  })

  // Initialize a new git repository
  ipcMain.handle('git:init', async (_, repoPath: string): Promise<void> => {
    return gitService.init(repoPath)
  })

  // Check if directory is a git repo
  ipcMain.handle('git:isRepo', async (_, repoPath: string): Promise<boolean> => {
    return gitService.isRepo(repoPath)
  })
}
