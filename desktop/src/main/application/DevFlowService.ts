import * as fs from 'fs'
import * as path from 'path'
import {
  REQUIRED_STRUCTURE,
  generateProjectYaml,
  generateMemoryIndex,
  generateActiveContext,
  generateKnowledgeGraph,
} from '../domain/devflow/ProjectTemplate'

export interface AgentVersionInfo {
  id: string
  name: string
  templateVersion: string
  projectVersion: string | null
  needsUpdate: boolean
}

export interface DevFlowStatus {
  isDevFlowProject: boolean
  hasAgents: boolean
  hasDevflowFolder: boolean
  missingFiles: string[]
  missingFolders: string[]
  hasUpdates: boolean
  outdatedAgents: AgentVersionInfo[]
}

const AGENT_IDS = ['strategist', 'architect', 'designer', 'builder', 'guardian', 'chronicler'] as const

/**
 * Service responsible for DevFlow project setup and validation.
 * Manages template files and project structure.
 */
export class DevFlowService {
  /**
   * Extract version from a .meta.yaml file content
   */
  private extractVersionFromMetaYaml(content: string): { version: string; name: string } | null {
    try {
      // Simple YAML parsing for version field
      const versionMatch = content.match(/^\s*version:\s*["']?([^"'\n]+)["']?/m)
      const nameMatch = content.match(/^\s*name:\s*["']?([^"'\n]+)["']?/m)

      if (versionMatch) {
        return {
          version: versionMatch[1].trim(),
          name: nameMatch ? nameMatch[1].trim() : 'Unknown'
        }
      }
      return null
    } catch {
      return null
    }
  }

  /**
   * Compare two semantic versions. Returns:
   * -1 if v1 < v2
   *  0 if v1 === v2
   *  1 if v1 > v2
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number)
    const parts2 = v2.split('.').map(Number)

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0
      const p2 = parts2[i] || 0
      if (p1 < p2) return -1
      if (p1 > p2) return 1
    }
    return 0
  }

  /**
   * Check agent versions and identify outdated ones
   */
  private checkAgentVersions(templatesDir: string, projectPath: string): AgentVersionInfo[] {
    const results: AgentVersionInfo[] = []

    for (const agentId of AGENT_IDS) {
      const templateMetaPath = path.join(templatesDir, `.claude/commands/agents/${agentId}.meta.yaml`)
      const projectMetaPath = path.join(projectPath, `.claude/commands/agents/${agentId}.meta.yaml`)

      let templateVersion = '0.0.0'
      let templateName = agentId.charAt(0).toUpperCase() + agentId.slice(1)
      let projectVersion: string | null = null

      // Read template version
      if (fs.existsSync(templateMetaPath)) {
        const content = fs.readFileSync(templateMetaPath, 'utf-8')
        const parsed = this.extractVersionFromMetaYaml(content)
        if (parsed) {
          templateVersion = parsed.version
          templateName = parsed.name
        }
      }

      // Read project version (if exists)
      if (fs.existsSync(projectMetaPath)) {
        const content = fs.readFileSync(projectMetaPath, 'utf-8')
        const parsed = this.extractVersionFromMetaYaml(content)
        if (parsed) {
          projectVersion = parsed.version
        }
      }

      const needsUpdate = projectVersion !== null && this.compareVersions(projectVersion, templateVersion) < 0

      results.push({
        id: agentId,
        name: templateName,
        templateVersion,
        projectVersion,
        needsUpdate,
      })
    }

    return results
  }

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
    const templatesDir = this.getTemplatesDir()
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

    // Check agent versions (only if agents are installed)
    const outdatedAgents = hasAgents ? this.checkAgentVersions(templatesDir, projectPath) : []
    const hasUpdates = outdatedAgents.some(agent => agent.needsUpdate)

    return {
      isDevFlowProject: missingFiles.length === 0 && missingFolders.length === 0,
      hasAgents,
      hasDevflowFolder,
      missingFiles,
      missingFolders,
      hasUpdates,
      outdatedAgents,
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
   * Update DevFlow agents in a project (force copy all agent files)
   */
  update(projectPath: string): { success: boolean; error?: string; updatedAgents: string[] } {
    try {
      const templatesDir = this.getTemplatesDir()
      const updatedAgents: string[] = []

      // Force copy agent files (overwrite existing)
      this.copyFilesForce(templatesDir, projectPath, REQUIRED_STRUCTURE.agents)

      // Force copy subcommand files
      this.copyFilesForce(templatesDir, projectPath, REQUIRED_STRUCTURE.subcommands)

      // Force copy quick commands
      this.copyFilesForce(templatesDir, projectPath, REQUIRED_STRUCTURE.quick)

      // Force copy general commands
      this.copyFilesForce(templatesDir, projectPath, REQUIRED_STRUCTURE.general)

      // Identify which agents were updated
      for (const agentId of AGENT_IDS) {
        updatedAgents.push(agentId)
      }

      return { success: true, updatedAgents }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        updatedAgents: [],
      }
    }
  }

  /**
   * Helper function to copy files from templates to project (skip if exists)
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
   * Helper function to copy files from templates to project (force overwrite)
   */
  private copyFilesForce(templatesDir: string, projectPath: string, files: string[]): void {
    for (const file of files) {
      const srcPath = path.join(templatesDir, file)
      const destPath = path.join(projectPath, file)

      if (fs.existsSync(srcPath)) {
        // Ensure directory exists
        const destDir = path.dirname(destPath)
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true })
        }
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
