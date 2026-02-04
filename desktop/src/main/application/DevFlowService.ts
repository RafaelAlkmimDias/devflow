import * as fs from 'fs'
import * as path from 'path'
import {
  REQUIRED_STRUCTURE,
  generateProjectYaml,
  generateMemoryIndex,
  generateActiveContext,
  generateKnowledgeGraph,
} from '../domain/devflow/ProjectTemplate'

export interface DevFlowStatus {
  isDevFlowProject: boolean
  hasAgents: boolean
  hasDevflowFolder: boolean
  missingFiles: string[]
  missingFolders: string[]
}

/**
 * Service responsible for DevFlow project setup and validation.
 * Manages template files and project structure.
 */
export class DevFlowService {
  /**
   * Get the templates directory - bundled with the app or in development
   */
  private getTemplatesDir(): string {
    // In development, templates are in the parent devflow directory
    // In production, they should be in the app resources
    const devPath = path.join(__dirname, '../../../../')
    const prodPath = process.resourcesPath
      ? path.join(process.resourcesPath, 'templates')
      : devPath

    // Check if we're in development
    if (fs.existsSync(path.join(devPath, '.claude/commands/agents/strategist.md'))) {
      return devPath
    }

    return prodPath
  }

  /**
   * Check if a project has DevFlow setup
   */
  check(projectPath: string): DevFlowStatus {
    const missingFiles: string[] = []
    const missingFolders: string[] = []

    // Check for required folders
    for (const folder of REQUIRED_STRUCTURE.folders) {
      const folderPath = path.join(projectPath, folder)
      if (!fs.existsSync(folderPath)) {
        missingFolders.push(folder)
      }
    }

    // Check for agent files
    for (const file of REQUIRED_STRUCTURE.agents) {
      const filePath = path.join(projectPath, file)
      if (!fs.existsSync(filePath)) {
        missingFiles.push(file)
      }
    }

    // Check for devflow files
    for (const file of REQUIRED_STRUCTURE.devflow) {
      const filePath = path.join(projectPath, file)
      if (!fs.existsSync(filePath)) {
        missingFiles.push(file)
      }
    }

    const hasAgents = REQUIRED_STRUCTURE.agents.every((file) =>
      fs.existsSync(path.join(projectPath, file))
    )

    const hasDevflowFolder = fs.existsSync(path.join(projectPath, '.devflow'))

    return {
      isDevFlowProject: missingFiles.length === 0 && missingFolders.length === 0,
      hasAgents,
      hasDevflowFolder,
      missingFiles,
      missingFolders,
    }
  }

  /**
   * Setup DevFlow in a project (copy all required files)
   */
  setup(projectPath: string): { success: boolean; error?: string } {
    try {
      const templatesDir = this.getTemplatesDir()

      // Create required folders first
      for (const folder of REQUIRED_STRUCTURE.folders) {
        const folderPath = path.join(projectPath, folder)
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true })
        }
      }

      // Copy agent files
      this.copyFiles(templatesDir, projectPath, REQUIRED_STRUCTURE.agents)

      // Copy subcommand files
      this.copyFiles(templatesDir, projectPath, REQUIRED_STRUCTURE.subcommands)

      // Copy quick commands
      this.copyFiles(templatesDir, projectPath, REQUIRED_STRUCTURE.quick)

      // Copy general commands
      this.copyFiles(templatesDir, projectPath, REQUIRED_STRUCTURE.general)

      // Generate devflow files
      const projectName = path.basename(projectPath)
      this.generateDevFlowFiles(templatesDir, projectPath, projectName)

      // Create .gitkeep files in empty directories
      this.createGitKeepFiles(projectPath)

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Helper function to copy files from templates to project
   */
  private copyFiles(templatesDir: string, projectPath: string, files: string[]): void {
    for (const file of files) {
      const srcPath = path.join(templatesDir, file)
      const destPath = path.join(projectPath, file)

      if (fs.existsSync(srcPath) && !fs.existsSync(destPath)) {
        const content = fs.readFileSync(srcPath, 'utf-8')
        fs.writeFileSync(destPath, content, 'utf-8')
      }
    }
  }

  /**
   * Generate DevFlow-specific files with project data
   */
  private generateDevFlowFiles(templatesDir: string, projectPath: string, projectName: string): void {
    for (const file of REQUIRED_STRUCTURE.devflow) {
      const destPath = path.join(projectPath, file)

      if (!fs.existsSync(destPath)) {
        if (file === '.devflow/project.yaml') {
          fs.writeFileSync(destPath, generateProjectYaml(projectName), 'utf-8')
        } else if (file === '.devflow/memory/index.json') {
          fs.writeFileSync(destPath, generateMemoryIndex(), 'utf-8')
        } else if (file === '.devflow/memory/active.json') {
          fs.writeFileSync(destPath, generateActiveContext(projectName), 'utf-8')
        } else if (file === '.devflow/knowledge-graph.json') {
          fs.writeFileSync(destPath, generateKnowledgeGraph(), 'utf-8')
        } else {
          // Copy from templates
          const srcPath = path.join(templatesDir, file)
          if (fs.existsSync(srcPath)) {
            const content = fs.readFileSync(srcPath, 'utf-8')
            fs.writeFileSync(destPath, content, 'utf-8')
          }
        }
      }
    }
  }

  /**
   * Create .gitkeep files in empty directories
   */
  private createGitKeepFiles(projectPath: string): void {
    const gitkeepFolders = ['.devflow/sessions', '.devflow/snapshots']
    for (const folder of gitkeepFolders) {
      const gitkeepPath = path.join(projectPath, folder, '.gitkeep')
      if (!fs.existsSync(gitkeepPath)) {
        fs.writeFileSync(gitkeepPath, '', 'utf-8')
      }
    }
  }
}

// Singleton instance
export const devFlowService = new DevFlowService()
