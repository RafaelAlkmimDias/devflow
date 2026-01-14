// Shared types between main and renderer processes

export interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileTreeNode[]
}

export interface FileStats {
  size: number
  isDirectory: boolean
  isFile: boolean
  created: string
  modified: string
}

export interface GitStatus {
  current: string | null
  tracking: string | null
  ahead: number
  behind: number
  staged: string[]
  modified: string[]
  not_added: string[]
  deleted: string[]
  conflicted: string[]
  isClean: boolean
}

export interface GitCommit {
  hash: string
  date: string
  message: string
  author_name: string
  author_email: string
}

export interface GitBranches {
  current: string
  all: string[]
  branches: GitBranch[]
}

export interface GitBranch {
  name: string
  current: boolean
  commit: string
}

export interface Spec {
  id: string
  title: string
  status: string
  priority: string
  content: string
  tasks: SpecTask[]
  metadata: Record<string, unknown>
}

export interface SpecTask {
  text: string
  completed: boolean
}

export interface SearchOptions {
  fileTypes?: string[]
  caseSensitive?: boolean
  maxResults?: number
  includeHidden?: boolean
}

export interface SearchResult {
  file: string
  line: number
  content: string
  match: string
}

export interface TerminalSession {
  id: string
  cwd: string
  isAlive: boolean
}

export interface ProjectInfo {
  path: string
  name: string
  lastOpened: string
}

// Agent types
export type AgentType = 'strategist' | 'architect' | 'builder' | 'guardian' | 'chronicler'

export interface AgentExecution {
  agent: AgentType
  prompt: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  output?: string
  error?: string
}

// IPC Channel names
export const IPC_CHANNELS = {
  // Files
  FILES_READ: 'files:read',
  FILES_WRITE: 'files:write',
  FILES_CREATE: 'files:create',
  FILES_DELETE: 'files:delete',
  FILES_RENAME: 'files:rename',
  FILES_TREE: 'files:tree',
  FILES_STATS: 'files:stats',

  // Terminal
  TERMINAL_CREATE: 'terminal:create',
  TERMINAL_WRITE: 'terminal:write',
  TERMINAL_RESIZE: 'terminal:resize',
  TERMINAL_DESTROY: 'terminal:destroy',
  TERMINAL_GET_BUFFER: 'terminal:getBuffer',
  TERMINAL_DATA: 'terminal:data',
  TERMINAL_EXIT: 'terminal:exit',

  // Git
  GIT_STATUS: 'git:status',
  GIT_STAGE: 'git:stage',
  GIT_UNSTAGE: 'git:unstage',
  GIT_COMMIT: 'git:commit',
  GIT_LOG: 'git:log',
  GIT_DIFF: 'git:diff',
  GIT_BRANCHES: 'git:branches',
  GIT_CHECKOUT: 'git:checkout',
  GIT_CREATE_BRANCH: 'git:createBranch',
  GIT_PULL: 'git:pull',
  GIT_PUSH: 'git:push',

  // Specs
  SPECS_PARSE: 'specs:parse',

  // Search
  SEARCH_CODE: 'search:code',
  SEARCH_FILES: 'search:files',

  // Autopilot
  AUTOPILOT_EXECUTE: 'autopilot:execute',

  // Dialog/Project
  DIALOG_SELECT_DIRECTORY: 'dialog:selectDirectory',
  PROJECT_GET_RECENT: 'project:getRecent',
  PROJECT_ADD_RECENT: 'project:addRecent',
  PROJECT_REMOVE_RECENT: 'project:removeRecent',

  // App
  APP_VERSION: 'app:version',
  APP_OPEN_EXTERNAL: 'app:openExternal',
} as const
