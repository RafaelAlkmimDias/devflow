import type { SearchOptions, SearchResult } from '@shared/types'

/**
 * Search API operations
 */
export const searchApi = {
  searchCode: (rootPath: string, query: string, options?: SearchOptions): Promise<SearchResult[]> => {
    return window.electronAPI.searchCode(rootPath, query, options)
  },

  searchFiles: (rootPath: string, query: string): Promise<string[]> => {
    return window.electronAPI.searchFiles(rootPath, query)
  },
}
