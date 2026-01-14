import { ipcMain } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import { FileTreeNode, FileStats } from '../../shared/types'

// Directories to ignore when building file tree
const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '__pycache__',
  '.cache',
  '.vscode',
  '.idea',
  'coverage',
  '.nyc_output',
  '.turbo',
])

// Files to ignore
const IGNORED_FILES = new Set(['.DS_Store', 'Thumbs.db', '.gitkeep'])

export function registerFileHandlers(): void {
  // Read file
  ipcMain.handle('files:read', async (_, filePath: string): Promise<string> => {
    // Security: prevent path traversal
    const normalizedPath = path.normalize(filePath)
    if (normalizedPath.includes('..')) {
      throw new Error('Invalid file path')
    }

    const content = await fs.readFile(normalizedPath, 'utf-8')
    return content
  })

  // Write file
  ipcMain.handle('files:write', async (_, filePath: string, content: string): Promise<void> => {
    const normalizedPath = path.normalize(filePath)
    if (normalizedPath.includes('..')) {
      throw new Error('Invalid file path')
    }

    // Ensure directory exists
    const dir = path.dirname(normalizedPath)
    await fs.mkdir(dir, { recursive: true })

    await fs.writeFile(normalizedPath, content, 'utf-8')
  })

  // Create file or directory
  ipcMain.handle('files:create', async (_, filePath: string, isDirectory: boolean): Promise<void> => {
    const normalizedPath = path.normalize(filePath)
    if (normalizedPath.includes('..')) {
      throw new Error('Invalid file path')
    }

    if (isDirectory) {
      await fs.mkdir(normalizedPath, { recursive: true })
    } else {
      // Ensure parent directory exists
      const dir = path.dirname(normalizedPath)
      await fs.mkdir(dir, { recursive: true })
      await fs.writeFile(normalizedPath, '', 'utf-8')
    }
  })

  // Delete file or directory
  ipcMain.handle('files:delete', async (_, filePath: string): Promise<void> => {
    const normalizedPath = path.normalize(filePath)
    if (normalizedPath.includes('..')) {
      throw new Error('Invalid file path')
    }

    const stat = await fs.stat(normalizedPath)
    if (stat.isDirectory()) {
      await fs.rm(normalizedPath, { recursive: true, force: true })
    } else {
      await fs.unlink(normalizedPath)
    }
  })

  // Rename file or directory
  ipcMain.handle('files:rename', async (_, oldPath: string, newPath: string): Promise<void> => {
    const normalizedOld = path.normalize(oldPath)
    const normalizedNew = path.normalize(newPath)

    if (normalizedOld.includes('..') || normalizedNew.includes('..')) {
      throw new Error('Invalid file path')
    }

    await fs.rename(normalizedOld, normalizedNew)
  })

  // Get file stats
  ipcMain.handle('files:stats', async (_, filePath: string): Promise<FileStats> => {
    const normalizedPath = path.normalize(filePath)
    if (normalizedPath.includes('..')) {
      throw new Error('Invalid file path')
    }

    const stat = await fs.stat(normalizedPath)
    return {
      size: stat.size,
      isDirectory: stat.isDirectory(),
      isFile: stat.isFile(),
      created: stat.birthtime.toISOString(),
      modified: stat.mtime.toISOString(),
    }
  })

  // Get file tree
  ipcMain.handle('files:tree', async (_, rootPath: string): Promise<FileTreeNode[]> => {
    const normalizedPath = path.normalize(rootPath)
    if (normalizedPath.includes('..')) {
      throw new Error('Invalid file path')
    }

    async function buildTree(dirPath: string, depth = 0): Promise<FileTreeNode[]> {
      // Limit depth to prevent excessive recursion
      if (depth > 10) return []

      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true })
        const nodes: FileTreeNode[] = []

        for (const entry of entries) {
          // Skip ignored items
          if (IGNORED_DIRS.has(entry.name) || IGNORED_FILES.has(entry.name)) {
            continue
          }

          // Skip hidden files (starting with .) except some important ones
          if (entry.name.startsWith('.') && !entry.name.startsWith('.env')) {
            continue
          }

          const fullPath = path.join(dirPath, entry.name)

          if (entry.isDirectory()) {
            nodes.push({
              name: entry.name,
              path: fullPath,
              type: 'directory',
              children: await buildTree(fullPath, depth + 1),
            })
          } else if (entry.isFile()) {
            nodes.push({
              name: entry.name,
              path: fullPath,
              type: 'file',
            })
          }
        }

        // Sort: directories first, then alphabetically
        return nodes.sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === 'directory' ? -1 : 1
          }
          return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        })
      } catch (error) {
        console.error(`Error reading directory ${dirPath}:`, error)
        return []
      }
    }

    return buildTree(normalizedPath)
  })
}
