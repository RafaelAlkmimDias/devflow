import type { FileTreeNode, FileStats } from '@shared/types'

/**
 * File system API operations
 */
export const fileApi = {
  read: (filePath: string): Promise<string> => {
    return window.electronAPI.readFile(filePath)
  },

  write: (filePath: string, content: string): Promise<void> => {
    return window.electronAPI.writeFile(filePath, content)
  },

  create: (filePath: string, isDirectory: boolean): Promise<void> => {
    return window.electronAPI.createFile(filePath, isDirectory)
  },

  delete: (filePath: string): Promise<void> => {
    return window.electronAPI.deleteFile(filePath)
  },

  rename: (oldPath: string, newPath: string): Promise<void> => {
    return window.electronAPI.renameFile(oldPath, newPath)
  },

  getTree: (rootPath: string): Promise<FileTreeNode[]> => {
    return window.electronAPI.getFileTree(rootPath)
  },

  getStats: (filePath: string): Promise<FileStats> => {
    return window.electronAPI.getFileStats(filePath)
  },
}
