/**
 * Required files/folders for DevFlow to work
 */
export const REQUIRED_STRUCTURE = {
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
  quick: [
    '.claude/commands/quick/new-feature.md',
    '.claude/commands/quick/create-adr.md',
    '.claude/commands/quick/security-check.md',
  ],
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

/**
 * Generate project.yaml content for a new DevFlow project
 */
export function generateProjectYaml(projectName: string): string {
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

/**
 * Generate memory index structure
 */
export function generateMemoryIndex(): string {
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

/**
 * Generate active context for a project
 */
export function generateActiveContext(projectName: string): string {
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

/**
 * Generate knowledge graph structure
 */
export function generateKnowledgeGraph(): string {
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
