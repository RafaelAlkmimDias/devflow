import fs from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { Spec } from '../../shared/types'
import {
  SPEC_DIRECTORIES,
  getSpecType,
  SPEC_TYPE_ORDER,
  PRIORITY_ORDER,
  STATUS_ORDER,
} from '../domain/specs/SpecConstants'

type TaskUpdateStatus = 'completed' | 'pending' | 'blocked'

interface TaskUpdateParams {
  filePath: string
  taskText: string
  completed?: boolean
  status?: TaskUpdateStatus
}

/**
 * Service responsible for managing specs, stories, and ADRs.
 * Handles parsing markdown files and extracting spec information.
 */
export class SpecsService {
  /**
   * Parse specs from project (searches multiple directories)
   */
  async parse(projectPath: string): Promise<Spec[]> {
    const specs: Spec[] = []
    const seenIds = new Set<string>()

    for (const relDir of SPEC_DIRECTORIES) {
      const dirPath = path.join(projectPath, relDir)

      if (!existsSync(dirPath)) {
        continue
      }

      const mdFiles = await this.getMdFiles(dirPath)

      for (const filePath of mdFiles) {
        const spec = await this.parseSpecFile(filePath, projectPath, seenIds)
        if (spec) {
          specs.push(spec)
        }
      }
    }

    return this.sortSpecs(specs)
  }

  /**
   * Update task status in markdown file
   */
  async updateTaskStatus(params: TaskUpdateParams): Promise<boolean> {
    try {
      const { filePath, taskText } = params
      // Support both old boolean API and new status API
      const status: TaskUpdateStatus = params.status ?? (params.completed ? 'completed' : 'pending')

      if (!existsSync(filePath)) {
        console.error(`File not found: ${filePath}`)
        return false
      }

      let content = await fs.readFile(filePath, 'utf-8')

      // Escape special regex characters in task text
      const escapedTaskText = taskText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      // Match any checkbox state: [ ], [x], [X], [-]
      const anyCheckboxPattern = new RegExp(`([-*]\\s*)\\[[ xX\\-]\\](\\s*${escapedTaskText})`, 'g')

      const marker = status === 'completed' ? '[x]' : status === 'blocked' ? '[-]' : '[ ]'
      content = content.replace(anyCheckboxPattern, `$1${marker}$2`)

      await fs.writeFile(filePath, content, 'utf-8')
      return true
    } catch (error) {
      console.error('[SpecsService] Error updating task status:', error)
      return false
    }
  }

  /**
   * Recursively get all markdown files from a directory
   */
  private async getMdFiles(dir: string): Promise<string[]> {
    const files: string[] = []

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          const subFiles = await this.getMdFiles(fullPath)
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

  /**
   * Parse a single spec file
   */
  private async parseSpecFile(
    filePath: string,
    projectPath: string,
    seenIds: Set<string>
  ): Promise<Spec | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const { data, content: body } = matter(content)

      const fileName = path.basename(filePath, '.md')
      const id = fileName.toLowerCase().replace(/\s+/g, '-')

      if (seenIds.has(id)) {
        return null
      }
      seenIds.add(id)

      // Extract title from frontmatter or first H1
      let title = data.title as string
      if (!title) {
        const h1Match = body.match(/^#\s+(.+)$/m)
        title = h1Match ? h1Match[1] : fileName.replace(/-/g, ' ')
      }

      // Extract tasks (checkboxes) from markdown
      const tasks = this.extractTasks(body)

      const specType = getSpecType(filePath)

      return {
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
      }
    } catch (error) {
      console.error(`Error parsing spec file ${filePath}:`, error)
      return null
    }
  }

  /**
   * Extract task checkboxes from markdown content
   */
  private extractTasks(content: string): { text: string; completed: boolean; status: 'pending' | 'completed' | 'blocked' }[] {
    const taskRegex = /[-*]\s*\[([ xX\-])\]\s*(.+)/g
    const tasks: { text: string; completed: boolean; status: 'pending' | 'completed' | 'blocked' }[] = []
    let match

    while ((match = taskRegex.exec(content)) !== null) {
      const marker = match[1]
      const isCompleted = marker.toLowerCase() === 'x'
      const isBlocked = marker === '-'
      tasks.push({
        completed: isCompleted,
        status: isBlocked ? 'blocked' : isCompleted ? 'completed' : 'pending',
        text: match[2].trim(),
      })
    }

    return tasks
  }

  /**
   * Sort specs by type, status, and priority
   */
  private sortSpecs(specs: Spec[]): Spec[] {
    return specs.sort((a, b) => {
      const typeA = (a.metadata?.type as string) || 'spec'
      const typeB = (b.metadata?.type as string) || 'spec'
      const typeDiff = (SPEC_TYPE_ORDER[typeA] ?? 99) - (SPEC_TYPE_ORDER[typeB] ?? 99)
      if (typeDiff !== 0) return typeDiff

      const statusDiff = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)
      if (statusDiff !== 0) return statusDiff

      return (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99)
    })
  }
}

// Singleton instance
export const specsService = new SpecsService()
