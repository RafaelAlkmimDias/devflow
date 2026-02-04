import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import { SearchResult, SearchOptions } from '../../shared/types'
import { IGNORED_DIRS, MAX_TREE_DEPTH } from '../domain/common/FileConstants'

const execAsync = promisify(exec)

// Check if ripgrep is available (cached)
let hasRipgrep: boolean | null = null

async function checkRipgrep(): Promise<boolean> {
  if (hasRipgrep !== null) return hasRipgrep

  try {
    await execAsync('rg --version')
    hasRipgrep = true
  } catch {
    hasRipgrep = false
  }
  return hasRipgrep
}

/**
 * Service for code and file search operations
 */
class SearchService {
  /**
   * Search for code in files using ripgrep or Node.js fallback
   */
  async searchCode(
    rootPath: string,
    query: string,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    const { fileTypes = [], caseSensitive = false, maxResults = 100 } = options || {}

    // Escape special regex characters for literal search
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    const useRipgrep = await checkRipgrep()

    if (useRipgrep) {
      return this.searchWithRipgrep(rootPath, escapedQuery, {
        fileTypes,
        caseSensitive,
        maxResults,
      })
    } else {
      return this.searchWithNodejs(rootPath, query, {
        fileTypes,
        caseSensitive,
        maxResults,
      })
    }
  }

  /**
   * Search for files by name
   */
  async searchFiles(rootPath: string, query: string): Promise<string[]> {
    const results: string[] = []
    const lowerQuery = query.toLowerCase()
    const maxResults = 100

    const searchDir = async (dirPath: string, depth = 0): Promise<void> => {
      if (depth > MAX_TREE_DEPTH || results.length >= maxResults) return

      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true })

        for (const entry of entries) {
          if (results.length >= maxResults) break

          // Skip ignored directories
          if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) {
            continue
          }

          const fullPath = path.join(dirPath, entry.name)

          if (entry.name.toLowerCase().includes(lowerQuery)) {
            results.push(fullPath)
          }

          if (entry.isDirectory()) {
            await searchDir(fullPath, depth + 1)
          }
        }
      } catch {
        // Ignore permission errors
      }
    }

    await searchDir(rootPath)
    return results
  }

  private async searchWithRipgrep(
    rootPath: string,
    query: string,
    options: { fileTypes: string[]; caseSensitive: boolean; maxResults: number }
  ): Promise<SearchResult[]> {
    const { fileTypes, caseSensitive, maxResults } = options

    const args = [
      '--json',
      '--max-count',
      String(maxResults),
      caseSensitive ? '' : '-i',
      ...fileTypes.map((t) => `-g "*.${t}"`),
      `"${query}"`,
      `"${rootPath}"`,
    ]
      .filter(Boolean)
      .join(' ')

    try {
      const { stdout } = await execAsync(`rg ${args}`, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      })

      const results: SearchResult[] = []

      for (const line of stdout.split('\n')) {
        if (!line) continue

        try {
          const parsed = JSON.parse(line)
          if (parsed.type === 'match') {
            results.push({
              file: parsed.data.path.text,
              line: parsed.data.line_number,
              content: parsed.data.lines.text.trim(),
              match: parsed.data.submatches[0]?.match?.text || '',
            })
          }
        } catch {
          // Skip invalid JSON lines
        }
      }

      return results
    } catch (error) {
      // rg returns exit code 1 when no matches found
      if ((error as NodeJS.ErrnoException).code === '1') {
        return []
      }
      console.error('Ripgrep search failed:', error)
      return []
    }
  }

  private async searchWithNodejs(
    rootPath: string,
    query: string,
    options: { fileTypes: string[]; caseSensitive: boolean; maxResults: number }
  ): Promise<SearchResult[]> {
    const { fileTypes, caseSensitive, maxResults } = options
    const results: SearchResult[] = []

    const regex = new RegExp(query, caseSensitive ? 'g' : 'gi')

    const searchFile = async (filePath: string): Promise<void> => {
      if (results.length >= maxResults) return

      try {
        const content = await fs.readFile(filePath, 'utf-8')
        const lines = content.split('\n')

        for (let i = 0; i < lines.length; i++) {
          if (results.length >= maxResults) break

          const line = lines[i]
          const match = line.match(regex)

          if (match) {
            results.push({
              file: filePath,
              line: i + 1,
              content: line.trim(),
              match: match[0],
            })
          }
        }
      } catch {
        // Skip files that can't be read
      }
    }

    const searchDir = async (dirPath: string, depth = 0): Promise<void> => {
      if (depth > MAX_TREE_DEPTH || results.length >= maxResults) return

      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true })

        for (const entry of entries) {
          if (results.length >= maxResults) break

          // Skip ignored directories
          if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) {
            continue
          }

          const fullPath = path.join(dirPath, entry.name)

          if (entry.isDirectory()) {
            await searchDir(fullPath, depth + 1)
          } else if (entry.isFile()) {
            // Check file type filter
            if (fileTypes.length > 0) {
              const ext = path.extname(entry.name).slice(1)
              if (!fileTypes.includes(ext)) continue
            }

            await searchFile(fullPath)
          }
        }
      } catch {
        // Ignore permission errors
      }
    }

    await searchDir(rootPath)
    return results
  }
}

export const searchService = new SearchService()
