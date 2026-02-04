import fs from 'fs/promises'
import path from 'path'
import { FileTreeNode, FileStats } from '../../shared/types'
import { IGNORED_DIRS, IGNORED_FILES, MAX_TREE_DEPTH } from '../domain/common/FileConstants'

/**
 * Service responsible for file system operations.
 * Handles file CRUD operations and file tree generation.
 */
export class FileService {
  /**
   * Validate and normalize a file path, preventing path traversal attacks
   */
  private normalizePath(filePath: string): string {
    const normalized = path.normalize(filePath)
    if (normalized.includes('..')) {
      throw new Error('Invalid file path')
    }
    return normalized
  }

  /**
   * Read file contents
   */
  async read(filePath: string): Promise<string> {
    const normalizedPath = this.normalizePath(filePath)
    return fs.readFile(normalizedPath, 'utf-8')
  }

  /**
   * Write content to a file, creating parent directories if needed
   */
  async write(filePath: string, content: string): Promise<void> {
    const normalizedPath = this.normalizePath(filePath)
    const dir = path.dirname(normalizedPath)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(normalizedPath, content, 'utf-8')
  }

  /**
   * Create a file or directory
   */
  async create(filePath: string, isDirectory: boolean): Promise<void> {
    const normalizedPath = this.normalizePath(filePath)

    if (isDirectory) {
      await fs.mkdir(normalizedPath, { recursive: true })
    } else {
      const dir = path.dirname(normalizedPath)
      await fs.mkdir(dir, { recursive: true })
      await fs.writeFile(normalizedPath, '', 'utf-8')
    }
  }

  /**
   * Delete a file or directory
   */
  async delete(filePath: string): Promise<void> {
    const normalizedPath = this.normalizePath(filePath)
    const stat = await fs.stat(normalizedPath)

    if (stat.isDirectory()) {
      await fs.rm(normalizedPath, { recursive: true, force: true })
    } else {
      await fs.unlink(normalizedPath)
    }
  }

  /**
   * Rename a file or directory
   */
  async rename(oldPath: string, newPath: string): Promise<void> {
    const normalizedOld = this.normalizePath(oldPath)
    const normalizedNew = this.normalizePath(newPath)
    await fs.rename(normalizedOld, normalizedNew)
  }

  /**
   * Get file stats
   */
  async getStats(filePath: string): Promise<FileStats> {
    const normalizedPath = this.normalizePath(filePath)
    const stat = await fs.stat(normalizedPath)

    return {
      size: stat.size,
      isDirectory: stat.isDirectory(),
      isFile: stat.isFile(),
      created: stat.birthtime.toISOString(),
      modified: stat.mtime.toISOString(),
    }
  }

  /**
   * Build a file tree for a directory
   */
  async getTree(rootPath: string): Promise<FileTreeNode[]> {
    const normalizedPath = this.normalizePath(rootPath)
    return this.buildTree(normalizedPath, 0)
  }

  /**
   * Recursively build file tree
   */
  private async buildTree(dirPath: string, depth: number): Promise<FileTreeNode[]> {
    if (depth > MAX_TREE_DEPTH) return []

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      const nodes: FileTreeNode[] = []

      for (const entry of entries) {
        if (this.shouldIgnore(entry.name)) {
          continue
        }

        const fullPath = path.join(dirPath, entry.name)

        if (entry.isDirectory()) {
          nodes.push({
            name: entry.name,
            path: fullPath,
            type: 'directory',
            children: await this.buildTree(fullPath, depth + 1),
          })
        } else if (entry.isFile()) {
          nodes.push({
            name: entry.name,
            path: fullPath,
            type: 'file',
          })
        }
      }

      return this.sortNodes(nodes)
    } catch (error) {
      console.error(`Error reading directory ${dirPath}:`, error)
      return []
    }
  }

  /**
   * Check if a file/directory should be ignored
   */
  private shouldIgnore(name: string): boolean {
    if (IGNORED_DIRS.has(name) || IGNORED_FILES.has(name)) {
      return true
    }
    // Skip hidden files except some important ones
    if (name.startsWith('.') && !name.startsWith('.env')) {
      return true
    }
    return false
  }

  /**
   * Sort nodes: directories first, then alphabetically
   */
  private sortNodes(nodes: FileTreeNode[]): FileTreeNode[] {
    return nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    })
  }
}

// Singleton instance
export const fileService = new FileService()
