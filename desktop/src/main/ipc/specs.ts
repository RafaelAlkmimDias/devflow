import { ipcMain } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'
import { Spec } from '../../shared/types'

export function registerSpecsHandlers(): void {
  // Parse specs from directory
  ipcMain.handle('specs:parse', async (_, specsPath: string): Promise<Spec[]> => {
    const specs: Spec[] = []

    try {
      // Check if directory exists
      const stat = await fs.stat(specsPath)
      if (!stat.isDirectory()) {
        return []
      }

      const files = await fs.readdir(specsPath)
      const mdFiles = files.filter((f) => f.endsWith('.md'))

      for (const file of mdFiles) {
        const filePath = path.join(specsPath, file)

        try {
          const content = await fs.readFile(filePath, 'utf-8')
          const { data, content: body } = matter(content)

          // Extract tasks (checkboxes) from markdown
          const taskRegex = /- \[([ xX])\] (.+)/g
          const tasks: { text: string; completed: boolean }[] = []
          let match

          while ((match = taskRegex.exec(body)) !== null) {
            tasks.push({
              completed: match[1].toLowerCase() === 'x',
              text: match[2].trim(),
            })
          }

          specs.push({
            id: file.replace('.md', ''),
            title: (data.title as string) || file.replace('.md', '').replace(/-/g, ' '),
            status: (data.status as string) || 'draft',
            priority: (data.priority as string) || 'medium',
            content: body,
            tasks,
            metadata: data,
          })
        } catch (error) {
          console.error(`Error parsing spec file ${file}:`, error)
        }
      }

      // Sort by priority and status
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
      const statusOrder: Record<string, number> = {
        'in-progress': 0,
        todo: 1,
        draft: 2,
        done: 3,
      }

      specs.sort((a, b) => {
        const statusDiff =
          (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99)
        if (statusDiff !== 0) return statusDiff

        return (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99)
      })
    } catch (error) {
      console.error('Error reading specs directory:', error)
    }

    return specs
  })
}
