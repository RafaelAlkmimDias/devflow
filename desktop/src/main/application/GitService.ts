import simpleGit, { SimpleGit } from 'simple-git'
import { GitStatus, GitCommit, GitBranches } from '../../shared/types'

/**
 * Service responsible for Git operations.
 * Wraps simple-git library for all Git functionality.
 */
export class GitService {
  /**
   * Get a SimpleGit instance for a repository
   */
  private getGit(repoPath: string): SimpleGit {
    return simpleGit(repoPath)
  }

  /**
   * Get repository status
   */
  async getStatus(repoPath: string): Promise<GitStatus> {
    const git = this.getGit(repoPath)
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
  }

  /**
   * Stage files
   */
  async stage(repoPath: string, files: string[]): Promise<void> {
    const git = this.getGit(repoPath)
    await git.add(files)
  }

  /**
   * Unstage files
   */
  async unstage(repoPath: string, files: string[]): Promise<void> {
    const git = this.getGit(repoPath)
    await git.reset(['HEAD', '--', ...files])
  }

  /**
   * Commit changes
   */
  async commit(repoPath: string, message: string): Promise<void> {
    const git = this.getGit(repoPath)
    await git.commit(message)
  }

  /**
   * Get commit log
   */
  async getLog(repoPath: string, limit: number = 50): Promise<GitCommit[]> {
    const git = this.getGit(repoPath)
    const log = await git.log({ maxCount: limit })

    return log.all.map((commit) => ({
      hash: commit.hash,
      date: commit.date,
      message: commit.message,
      author_name: commit.author_name,
      author_email: commit.author_email,
    }))
  }

  /**
   * Get diff
   */
  async getDiff(repoPath: string, file?: string): Promise<string> {
    const git = this.getGit(repoPath)

    if (file) {
      return git.diff(['--', file])
    }

    return git.diff()
  }

  /**
   * Get branches
   */
  async getBranches(repoPath: string): Promise<GitBranches> {
    const git = this.getGit(repoPath)
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
  }

  /**
   * Checkout branch
   */
  async checkout(repoPath: string, branch: string): Promise<void> {
    const git = this.getGit(repoPath)
    await git.checkout(branch)
  }

  /**
   * Create and checkout new branch
   */
  async createBranch(repoPath: string, branch: string): Promise<void> {
    const git = this.getGit(repoPath)
    await git.checkoutLocalBranch(branch)
  }

  /**
   * Pull from remote
   */
  async pull(repoPath: string): Promise<void> {
    const git = this.getGit(repoPath)
    await git.pull()
  }

  /**
   * Push to remote
   */
  async push(repoPath: string): Promise<void> {
    const git = this.getGit(repoPath)
    await git.push()
  }

  /**
   * Discard changes in files
   */
  async discard(repoPath: string, files: string[]): Promise<void> {
    const git = this.getGit(repoPath)
    await git.checkout(['--', ...files])
  }

  /**
   * Initialize a new git repository
   */
  async init(repoPath: string): Promise<void> {
    const git = this.getGit(repoPath)
    await git.init()
  }

  /**
   * Check if directory is a git repo
   */
  async isRepo(repoPath: string): Promise<boolean> {
    const git = this.getGit(repoPath)
    try {
      await git.status()
      return true
    } catch {
      return false
    }
  }
}

// Singleton instance
export const gitService = new GitService()
