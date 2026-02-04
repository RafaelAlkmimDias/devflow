import { ipcMain } from 'electron'
import { SearchResult, SearchOptions } from '../../shared/types'
import { searchService } from '../application/SearchService'

/**
 * Register IPC handlers for search operations.
 * Handlers delegate to SearchService for actual operations.
 */
export function registerSearchHandlers(): void {
  // Search code in files
  ipcMain.handle(
    'search:code',
    async (
      _,
      rootPath: string,
      query: string,
      options?: SearchOptions
    ): Promise<SearchResult[]> => {
      return searchService.searchCode(rootPath, query, options)
    }
  )

  // Search for files by name
  ipcMain.handle(
    'search:files',
    async (_, rootPath: string, query: string): Promise<string[]> => {
      return searchService.searchFiles(rootPath, query)
    }
  )
}
