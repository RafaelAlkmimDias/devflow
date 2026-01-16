import { ipcMain } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

// Required files/folders for DevFlow to work
const REQUIRED_STRUCTURE = {
  agents: [
    '.claude/commands/agents/strategist.md',
    '.claude/commands/agents/strategist.meta.yaml',
    '.claude/commands/agents/architect.md',
    '.claude/commands/agents/architect.meta.yaml',
    '.claude/commands/agents/builder.md',
    '.claude/commands/agents/builder.meta.yaml',
    '.claude/commands/agents/guardian.md',
    '.claude/commands/agents/guardian.meta.yaml',
    '.claude/commands/agents/chronicler.md',
    '.claude/commands/agents/chronicler.meta.yaml',
  ],
  // Agent subcommands (skills)
  subcommands: [
    // Strategist subcommands
    '.claude/commands/strategist/analyze.md',
    '.claude/commands/strategist/prd.md',
    '.claude/commands/strategist/stories.md',
    '.claude/commands/strategist/prioritize.md',
    // Architect subcommands
    '.claude/commands/architect/design.md',
    '.claude/commands/architect/adr.md',
    '.claude/commands/architect/diagram.md',
    '.claude/commands/architect/review-arch.md',
    // Builder subcommands
    '.claude/commands/builder/implement.md',
    '.claude/commands/builder/review.md',
    '.claude/commands/builder/refactor.md',
    '.claude/commands/builder/debug.md',
    // Guardian subcommands
    '.claude/commands/guardian/test-plan.md',
    '.claude/commands/guardian/security-audit.md',
    '.claude/commands/guardian/perf-review.md',
    '.claude/commands/guardian/ci-setup.md',
    // Chronicler subcommands
    '.claude/commands/chronicler/document.md',
    '.claude/commands/chronicler/update-docs.md',
    '.claude/commands/chronicler/snapshot.md',
    '.claude/commands/chronicler/sync-check.md',
    '.claude/commands/chronicler/decision.md',
  ],
  // Quick commands
  quick: [
    '.claude/commands/quick/new-feature.md',
    '.claude/commands/quick/create-adr.md',
    '.claude/commands/quick/security-check.md',
  ],
  // General commands
  general: [
    '.claude/commands/devflow-help.md',
    '.claude/commands/devflow-status.md',
  ],
  devflow: [
    '.devflow/project.yaml',
    '.devflow/knowledge-graph.json',
    '.devflow/memory/index.json',
    '.devflow/memory/active.json',
    '.devflow/agents/strategist.meta.yaml',
    '.devflow/agents/architect.meta.yaml',
    '.devflow/agents/builder.meta.yaml',
    '.devflow/agents/guardian.meta.yaml',
    '.devflow/agents/chronicler.meta.yaml',
  ],
  folders: [
    '.claude/commands/agents',
    '.claude/commands/strategist',
    '.claude/commands/architect',
    '.claude/commands/builder',
    '.claude/commands/guardian',
    '.claude/commands/chronicler',
    '.claude/commands/quick',
    '.devflow/agents',
    '.devflow/memory',
    '.devflow/sessions',
    '.devflow/snapshots',
  ],
}

export interface DevFlowStatus {
  isDevFlowProject: boolean
  hasAgents: boolean
  hasDevflowFolder: boolean
  missingFiles: string[]
  missingFolders: string[]
}

// Get the templates directory - this should be bundled with the app
function getTemplatesDir(): string {
  // In development, templates are in the parent devflow directory
  // In production, they should be in the app resources
  const devPath = path.join(__dirname, '../../../../')
  const prodPath = process.resourcesPath ? path.join(process.resourcesPath, 'templates') : devPath

  // Check if we're in development
  if (fs.existsSync(path.join(devPath, '.claude/commands/agents/strategist.md'))) {
    return devPath
  }

  return prodPath
}

export function registerDevFlowHandlers(): void {
  // Check if a project has DevFlow setup
  ipcMain.handle('devflow:check', async (_, projectPath: string): Promise<DevFlowStatus> => {
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
  })

  // Setup DevFlow in a project (copy all required files)
  ipcMain.handle('devflow:setup', async (_, projectPath: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const templatesDir = getTemplatesDir()

      // Create required folders first
      for (const folder of REQUIRED_STRUCTURE.folders) {
        const folderPath = path.join(projectPath, folder)
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true })
        }
      }

      // Helper function to copy files
      const copyFiles = (files: string[]) => {
        for (const file of files) {
          const srcPath = path.join(templatesDir, file)
          const destPath = path.join(projectPath, file)

          if (fs.existsSync(srcPath) && !fs.existsSync(destPath)) {
            const content = fs.readFileSync(srcPath, 'utf-8')
            fs.writeFileSync(destPath, content, 'utf-8')
          }
        }
      }

      // Copy agent files
      copyFiles(REQUIRED_STRUCTURE.agents)

      // Copy subcommand files
      copyFiles(REQUIRED_STRUCTURE.subcommands)

      // Copy quick commands
      copyFiles(REQUIRED_STRUCTURE.quick)

      // Copy general commands
      copyFiles(REQUIRED_STRUCTURE.general)

      // Copy devflow files (but generate project.yaml with project name)
      const projectName = path.basename(projectPath)

      for (const file of REQUIRED_STRUCTURE.devflow) {
        const destPath = path.join(projectPath, file)

        if (!fs.existsSync(destPath)) {
          if (file === '.devflow/project.yaml') {
            // Generate project.yaml with project-specific data
            const projectYaml = generateProjectYaml(projectName)
            fs.writeFileSync(destPath, projectYaml, 'utf-8')
          } else if (file === '.devflow/memory/index.json') {
            // Generate empty index
            fs.writeFileSync(destPath, generateMemoryIndex(), 'utf-8')
          } else if (file === '.devflow/memory/active.json') {
            // Generate active context
            fs.writeFileSync(destPath, generateActiveContext(projectName), 'utf-8')
          } else if (file === '.devflow/knowledge-graph.json') {
            // Generate knowledge graph
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

      // Create .gitkeep files in empty directories
      const gitkeepFolders = ['.devflow/sessions', '.devflow/snapshots']
      for (const folder of gitkeepFolders) {
        const gitkeepPath = path.join(projectPath, folder, '.gitkeep')
        if (!fs.existsSync(gitkeepPath)) {
          fs.writeFileSync(gitkeepPath, '', 'utf-8')
        }
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })
}

// Generate project.yaml content
function generateProjectYaml(projectName: string): string {
  return `# DevFlow Project Configuration
# Generated automatically - customize as needed

project:
  name: "${projectName}"
  version: "0.1.0"
  phase: "initial"
  description: ""

agents:
  - id: "strategist"
    role: "planning"
    active: true
  - id: "architect"
    role: "design"
    active: true
  - id: "builder"
    role: "implementation"
    active: true
  - id: "guardian"
    role: "quality"
    active: true
  - id: "chronicler"
    role: "documentation"
    active: true

tech_stack:
  core: []
  tools:
    - "Claude Code"
    - "Git"

workflow:
  default_flow: "strategist -> architect -> builder -> guardian -> chronicler"

created_at: "${new Date().toISOString()}"
`
}

// Generate memory index
function generateMemoryIndex(): string {
  return JSON.stringify(
    {
      agents: {
        strategist: { last_active: null, tasks_completed: 0 },
        architect: { last_active: null, tasks_completed: 0 },
        builder: { last_active: null, tasks_completed: 0 },
        guardian: { last_active: null, tasks_completed: 0 },
        chronicler: { last_active: null, tasks_completed: 0 },
      },
      adrs: {},
      stories: {},
      snapshots: {},
      tags: {},
    },
    null,
    2
  )
}

// Generate active context
function generateActiveContext(projectName: string): string {
  return JSON.stringify(
    {
      project: {
        name: projectName,
        version: '0.1.0',
        phase: 'initial',
      },
      current_focus: {
        sprint: null,
        goals: [],
        active_stories: [],
      },
      recent_decisions: [],
      active_features: [],
      tech_stack: {},
      architecture_principles: [],
      critical_constraints: [],
    },
    null,
    2
  )
}

// Generate knowledge graph
function generateKnowledgeGraph(): string {
  return JSON.stringify(
    {
      nodes: [
        { id: 'strategist', type: 'agent', label: 'Strategist' },
        { id: 'architect', type: 'agent', label: 'Architect' },
        { id: 'builder', type: 'agent', label: 'Builder' },
        { id: 'guardian', type: 'agent', label: 'Guardian' },
        { id: 'chronicler', type: 'agent', label: 'Chronicler' },
      ],
      edges: [
        { from: 'strategist', to: 'architect', type: 'delegates' },
        { from: 'architect', to: 'builder', type: 'delegates' },
        { from: 'builder', to: 'guardian', type: 'delegates' },
        { from: 'guardian', to: 'chronicler', type: 'delegates' },
        { from: 'guardian', to: 'builder', type: 'rejects' },
      ],
    },
    null,
    2
  )
}
