import { useCallback } from 'react'
import { fileApi } from '@/infrastructure/api'
import type { FileTreeNode, FileStats } from '@shared/types'

/**
 * Hook for file system operations.
 * Provides methods for reading, writing, and managing files.
 */
export function useFileOperations() {
  const readFile = useCallback(async (filePath: string): Promise<string> => {
    return fileApi.read(filePath)
  }, [])

  const writeFile = useCallback(async (filePath: string, content: string): Promise<void> => {
    return fileApi.write(filePath, content)
  }, [])

  const createFile = useCallback(async (filePath: string, isDirectory: boolean): Promise<void> => {
    return fileApi.create(filePath, isDirectory)
  }, [])

  const deleteFile = useCallback(async (filePath: string): Promise<void> => {
    return fileApi.delete(filePath)
  }, [])

  const renameFile = useCallback(async (oldPath: string, newPath: string): Promise<void> => {
    return fileApi.rename(oldPath, newPath)
  }, [])

  const getFileTree = useCallback(async (rootPath: string): Promise<FileTreeNode[]> => {
    return fileApi.getTree(rootPath)
  }, [])

  const getFileStats = useCallback(async (filePath: string): Promise<FileStats> => {
    return fileApi.getStats(filePath)
  }, [])

  return {
    readFile,
    writeFile,
    createFile,
    deleteFile,
    renameFile,
    getFileTree,
    getFileStats,
  }
}
