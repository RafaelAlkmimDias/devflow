import { ipcMain } from 'electron'
import { FileTreeNode, FileStats } from '../../shared/types'
import { fileService } from '../application/FileService'

/**
 * Register IPC handlers for file operations.
 * Handlers delegate to FileService for actual operations.
 */
export function registerFileHandlers(): void {
  // Read file
  ipcMain.handle('files:read', async (_, filePath: string): Promise<string> => {
    return fileService.read(filePath)
  })

  // Write file
  ipcMain.handle('files:write', async (_, filePath: string, content: string): Promise<void> => {
    return fileService.write(filePath, content)
  })

  // Create file or directory
  ipcMain.handle('files:create', async (_, filePath: string, isDirectory: boolean): Promise<void> => {
    return fileService.create(filePath, isDirectory)
  })

  // Delete file or directory
  ipcMain.handle('files:delete', async (_, filePath: string): Promise<void> => {
    return fileService.delete(filePath)
  })

  // Rename file or directory
  ipcMain.handle('files:rename', async (_, oldPath: string, newPath: string): Promise<void> => {
    return fileService.rename(oldPath, newPath)
  })

  // Get file stats
  ipcMain.handle('files:stats', async (_, filePath: string): Promise<FileStats> => {
    return fileService.getStats(filePath)
  })

  // Get file tree
  ipcMain.handle('files:tree', async (_, rootPath: string): Promise<FileTreeNode[]> => {
    return fileService.getTree(rootPath)
  })
}
