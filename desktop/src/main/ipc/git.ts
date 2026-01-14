import { ipcMain } from 'electron'
import simpleGit, { SimpleGit } from 'simple-git'
import { GitStatus, GitCommit, GitBranches } from '../../shared/types'

function getGit(repoPath: string): SimpleGit {
  return simpleGit(repoPath)
}

export function registerGitHandlers(): void {
  // Get repository status
  ipcMain.handle('git:status', async (_, repoPath: string): Promise<GitStatus> => {
    const git = getGit(repoPath)
    const status = await git.status()

    return {
      current: status.current,
      tracking: status.tracking,
      ahead: status.ahead,
      behind: status.behind,
      staged: status.staged,
      modified: status.modified,
      not_added: status.not_added,
      deleted: status.deleted,
      conflicted: status.conflicted,
      isClean: status.isClean(),
    }
  })

  // Stage files
  ipcMain.handle('git:stage', async (_, repoPath: string, files: string[]): Promise<void> => {
    const git = getGit(repoPath)
    await git.add(files)
  })

  // Unstage files
  ipcMain.handle('git:unstage', async (_, repoPath: string, files: string[]): Promise<void> => {
    const git = getGit(repoPath)
    await git.reset(['HEAD', '--', ...files])
  })

  // Commit changes
  ipcMain.handle('git:commit', async (_, repoPath: string, message: string): Promise<void> => {
    const git = getGit(repoPath)
    await git.commit(message)
  })

  // Get commit log
  ipcMain.handle(
    'git:log',
    async (_, repoPath: string, limit: number = 50): Promise<GitCommit[]> => {
      const git = getGit(repoPath)
      const log = await git.log({ maxCount: limit })

      return log.all.map((commit) => ({
        hash: commit.hash,
        date: commit.date,
        message: commit.message,
        author_name: commit.author_name,
        author_email: commit.author_email,
      }))
    }
  )

  // Get diff
  ipcMain.handle('git:diff', async (_, repoPath: string, file?: string): Promise<string> => {
    const git = getGit(repoPath)

    if (file) {
      // Diff for specific file
      return git.diff(['--', file])
    }

    // Full diff
    return git.diff()
  })

  // Get branches
  ipcMain.handle('git:branches', async (_, repoPath: string): Promise<GitBranches> => {
    const git = getGit(repoPath)
    const branches = await git.branch()

    return {
      current: branches.current,
      all: branches.all,
      branches: Object.entries(branches.branches).map(([name, info]) => ({
        name,
        current: info.current,
        commit: info.commit,
      })),
    }
  })

  // Checkout branch
  ipcMain.handle('git:checkout', async (_, repoPath: string, branch: string): Promise<void> => {
    const git = getGit(repoPath)
    await git.checkout(branch)
  })

  // Create and checkout new branch
  ipcMain.handle('git:createBranch', async (_, repoPath: string, branch: string): Promise<void> => {
    const git = getGit(repoPath)
    await git.checkoutLocalBranch(branch)
  })

  // Pull from remote
  ipcMain.handle('git:pull', async (_, repoPath: string): Promise<void> => {
    const git = getGit(repoPath)
    await git.pull()
  })

  // Push to remote
  ipcMain.handle('git:push', async (_, repoPath: string): Promise<void> => {
    const git = getGit(repoPath)
    await git.push()
  })

  // Discard changes in files
  ipcMain.handle('git:discard', async (_, repoPath: string, files: string[]): Promise<void> => {
    const git = getGit(repoPath)
    await git.checkout(['--', ...files])
  })

  // Initialize a new git repository
  ipcMain.handle('git:init', async (_, repoPath: string): Promise<void> => {
    const git = getGit(repoPath)
    await git.init()
  })

  // Check if directory is a git repo
  ipcMain.handle('git:isRepo', async (_, repoPath: string): Promise<boolean> => {
    const git = getGit(repoPath)
    try {
      await git.status()
      return true
    } catch {
      return false
    }
  })
}
