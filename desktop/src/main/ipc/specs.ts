import { ipcMain } from 'electron'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { Spec } from '../../shared/types'

// Interface for task update
interface TaskUpdateParams {
  filePath: string
  taskText: string
  completed: boolean
}

// Directories where specs/stories/ADRs can be found (relative to project root)
const SPEC_DIRECTORIES = [
  'docs/planning/stories',      // User stories
  'docs/planning',              // PRDs and specs
  'docs/decisions',             // ADRs
  '.devflow/specs',             // Legacy location
]

// Determine spec type from file path
function getSpecType(filePath: string): 'story' | 'adr' | 'spec' {
  const lowerPath = filePath.toLowerCase()

  if (lowerPath.includes('/stories/') || lowerPath.includes('us-') || lowerPath.includes('epic-')) {
    return 'story'
  }
  if (lowerPath.includes('/decisions/') || lowerPath.includes('adr-')) {
    return 'adr'
  }
  return 'spec'
}

// Recursively get all markdown files from a directory
async function getMdFiles(dir: string): Promise<string[]> {
  const files: string[] = []

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        // Recursively search subdirectories
        const subFiles = await getMdFiles(fullPath)
        files.push(...subFiles)
      } else if (entry.isFile() && entry.name.endsWith('.md') && !entry.name.startsWith('.')) {
        files.push(fullPath)
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return files
}

export function registerSpecsHandlers(): void {
  // Parse specs from project (searches multiple directories)
  ipcMain.handle('specs:parse', async (_, projectPath: string): Promise<Spec[]> => {
    const specs: Spec[] = []
    const seenIds = new Set<string>()

    // Search all spec directories
    for (const relDir of SPEC_DIRECTORIES) {
      const dirPath = path.join(projectPath, relDir)

      if (!existsSync(dirPath)) {
        continue
      }

      const mdFiles = await getMdFiles(dirPath)

      for (const filePath of mdFiles) {
        try {
          const content = await fs.readFile(filePath, 'utf-8')
          const { data, content: body } = matter(content)

          // Generate ID from filename
          const fileName = path.basename(filePath, '.md')
          const id = fileName.toLowerCase().replace(/\s+/g, '-')

          // Skip if we've already seen this ID
          if (seenIds.has(id)) {
            continue
          }
          seenIds.add(id)

          // Extract title from frontmatter or first H1
          let title = data.title as string
          if (!title) {
            const h1Match = body.match(/^#\s+(.+)$/m)
            title = h1Match ? h1Match[1] : fileName.replace(/-/g, ' ')
          }

          // Extract tasks (checkboxes) from markdown
          const taskRegex = /[-*]\s*\[([ xX])\]\s*(.+)/g
          const tasks: { text: string; completed: boolean }[] = []
          let match

          while ((match = taskRegex.exec(body)) !== null) {
            tasks.push({
              completed: match[1].toLowerCase() === 'x',
              text: match[2].trim(),
            })
          }

          // Determine spec type
          const specType = getSpecType(filePath)

          specs.push({
            id,
            title,
            status: (data.status as string) || 'draft',
            priority: (data.priority as string) || 'medium',
            content: body,
            tasks,
            metadata: {
              ...data,
              type: specType,
              filePath: path.relative(projectPath, filePath),
            },
          })
        } catch (error) {
          console.error(`Error parsing spec file ${filePath}:`, error)
        }
      }
    }

    // Sort by type, then priority and status
    const typeOrder: Record<string, number> = { story: 0, adr: 1, spec: 2 }
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
    const statusOrder: Record<string, number> = {
      'in-progress': 0,
      todo: 1,
      draft: 2,
      done: 3,
    }

    specs.sort((a, b) => {
      const typeA = (a.metadata?.type as string) || 'spec'
      const typeB = (b.metadata?.type as string) || 'spec'
      const typeDiff = (typeOrder[typeA] ?? 99) - (typeOrder[typeB] ?? 99)
      if (typeDiff !== 0) return typeDiff

      const statusDiff = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99)
      if (statusDiff !== 0) return statusDiff

      return (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99)
    })

    return specs
  })

  // Update task status in markdown file
  ipcMain.handle('specs:updateTaskStatus', async (_, params: TaskUpdateParams): Promise<boolean> => {
    try {
      const { filePath, taskText, completed } = params

      if (!existsSync(filePath)) {
        console.error(`File not found: ${filePath}`)
        return false
      }

      // Read the file
      let content = await fs.readFile(filePath, 'utf-8')

      // Escape special regex characters in task text
      const escapedTaskText = taskText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      // Match the checkbox line with this task text
      // Pattern: - [ ] or - [x] or - [X] followed by the task text
      const uncheckedPattern = new RegExp(`([-*]\\s*)\\[[ ]\\](\\s*${escapedTaskText})`, 'g')
      const checkedPattern = new RegExp(`([-*]\\s*)\\[[xX]\\](\\s*${escapedTaskText})`, 'g')

      if (completed) {
        // Mark as completed: change [ ] to [x]
        content = content.replace(uncheckedPattern, '$1[x]$2')
      } else {
        // Mark as incomplete: change [x] or [X] to [ ]
        content = content.replace(checkedPattern, '$1[ ]$2')
      }

      // Write back to file
      await fs.writeFile(filePath, content, 'utf-8')

      return true
    } catch (error) {
      console.error('[specs:updateTaskStatus] Error updating task status:', error)
      return false
    }
  })
}
