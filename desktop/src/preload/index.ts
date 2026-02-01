import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import type { DevFlowStatus, DevFlowSetupResult, Requirement, RequirementsStatus, AutopilotStreamData } from '../shared/types'

// Type definitions for the exposed API
export interface ElectronAPI {
  // Files
  readFile: (filePath: string) => Promise<string>
  writeFile: (filePath: string, content: string) => Promise<void>
  createFile: (filePath: string, isDirectory: boolean) => Promise<void>
  deleteFile: (filePath: string) => Promise<void>
  renameFile: (oldPath: string, newPath: string) => Promise<void>
  getFileTree: (rootPath: string) => Promise<FileTreeNode[]>
  getFileStats: (filePath: string) => Promise<FileStats>

  // Terminal
  createTerminal: (sessionId: string, cwd: string, cols?: number, rows?: number) => Promise<{ success: boolean }>
  writeTerminal: (sessionId: string, data: string) => Promise<void>
  resizeTerminal: (sessionId: string, cols: number, rows: number) => Promise<void>
  destroyTerminal: (sessionId: string) => Promise<void>
  getTerminalBuffer: (sessionId: string) => Promise<string>
  onTerminalData: (callback: (sessionId: string, data: string) => void) => () => void
  onTerminalExit: (callback: (sessionId: string, exitCode: number) => void) => () => void

  // Git
  gitStatus: (repoPath: string) => Promise<GitStatus>
  gitStage: (repoPath: string, files: string[]) => Promise<void>
  gitUnstage: (repoPath: string, files: string[]) => Promise<void>
  gitCommit: (repoPath: string, message: string) => Promise<void>
  gitLog: (repoPath: string, limit?: number) => Promise<GitCommit[]>
  gitDiff: (repoPath: string, file?: string) => Promise<string>
  gitBranches: (repoPath: string) => Promise<GitBranches>
  gitCheckout: (repoPath: string, branch: string) => Promise<void>
  gitCreateBranch: (repoPath: string, branch: string) => Promise<void>
  gitPull: (repoPath: string) => Promise<void>
  gitPush: (repoPath: string) => Promise<void>
  gitDiscard: (repoPath: string, files: string[]) => Promise<void>
  gitInit: (repoPath: string) => Promise<void>
  gitIsRepo: (repoPath: string) => Promise<boolean>

  // Specs
  parseSpecs: (specsPath: string) => Promise<Spec[]>
  updateTaskStatus: (filePath: string, taskText: string, completed: boolean) => Promise<boolean>

  // Search
  searchCode: (rootPath: string, query: string, options?: SearchOptions) => Promise<SearchResult[]>
  searchFiles: (rootPath: string, query: string) => Promise<string[]>

  // Autopilot
  executeAgent: (agent: string, prompt: string, cwd: string) => Promise<string>
  respondToAgent: (agent: string, response: string) => Promise<void>
  cancelAgent: (agent: string) => Promise<void>
  onAutopilotStream: (callback: (data: AutopilotStreamData) => void) => () => void

  // DevFlow
  checkDevFlow: (projectPath: string) => Promise<DevFlowStatus>
  setupDevFlow: (projectPath: string) => Promise<DevFlowSetupResult>

  // Requirements
  checkRequirements: () => Promise<RequirementsStatus>
  recheckRequirement: (requirementId: string) => Promise<Requirement | null>

  // Project/Dialog
  selectDirectory: () => Promise<string | null>
  getRecentProjects: () => Promise<string[]>
  addRecentProject: (projectPath: string) => Promise<void>
  removeRecentProject: (projectPath: string) => Promise<void>

  // App
  platform: NodeJS.Platform
  getVersion: () => Promise<string>
  openExternal: (url: string) => Promise<void>

  // Menu events
  onMenuEvent: (event: string, callback: () => void) => () => void
}

// Shared types (duplicated here for preload context)
interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileTreeNode[]
}

interface FileStats {
  size: number
  isDirectory: boolean
  isFile: boolean
  created: string
  modified: string
}

interface GitStatus {
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

interface GitCommit {
  hash: string
  date: string
  message: string
  author_name: string
  author_email: string
}

interface GitBranches {
  current: string
  all: string[]
  branches: { name: string; current: boolean; commit: string }[]
}

interface Spec {
  id: string
  title: string
  status: string
  priority: string
  content: string
  tasks: { text: string; completed: boolean }[]
  metadata: Record<string, unknown>
}

interface SearchOptions {
  fileTypes?: string[]
  caseSensitive?: boolean
  maxResults?: number
}

interface SearchResult {
  file: string
  line: number
  content: string
  match: string
}

// Expose API to renderer process
const api: ElectronAPI = {
  // Files
  readFile: (filePath) => ipcRenderer.invoke('files:read', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('files:write', filePath, content),
  createFile: (filePath, isDirectory) => ipcRenderer.invoke('files:create', filePath, isDirectory),
  deleteFile: (filePath) => ipcRenderer.invoke('files:delete', filePath),
  renameFile: (oldPath, newPath) => ipcRenderer.invoke('files:rename', oldPath, newPath),
  getFileTree: (rootPath) => ipcRenderer.invoke('files:tree', rootPath),
  getFileStats: (filePath) => ipcRenderer.invoke('files:stats', filePath),

  // Terminal
  createTerminal: (sessionId, cwd, cols, rows) => ipcRenderer.invoke('terminal:create', sessionId, cwd, cols, rows),
  writeTerminal: (sessionId, data) => ipcRenderer.invoke('terminal:write', sessionId, data),
  resizeTerminal: (sessionId, cols, rows) => ipcRenderer.invoke('terminal:resize', sessionId, cols, rows),
  destroyTerminal: (sessionId) => ipcRenderer.invoke('terminal:destroy', sessionId),
  getTerminalBuffer: (sessionId) => ipcRenderer.invoke('terminal:getBuffer', sessionId),
  onTerminalData: (callback) => {
    const handler = (_: IpcRendererEvent, sessionId: string, data: string) => callback(sessionId, data)
    ipcRenderer.on('terminal:data', handler)
    return () => ipcRenderer.removeListener('terminal:data', handler)
  },
  onTerminalExit: (callback) => {
    const handler = (_: IpcRendererEvent, sessionId: string, exitCode: number) => callback(sessionId, exitCode)
    ipcRenderer.on('terminal:exit', handler)
    return () => ipcRenderer.removeListener('terminal:exit', handler)
  },

  // Git
  gitStatus: (repoPath) => ipcRenderer.invoke('git:status', repoPath),
  gitStage: (repoPath, files) => ipcRenderer.invoke('git:stage', repoPath, files),
  gitUnstage: (repoPath, files) => ipcRenderer.invoke('git:unstage', repoPath, files),
  gitCommit: (repoPath, message) => ipcRenderer.invoke('git:commit', repoPath, message),
  gitLog: (repoPath, limit) => ipcRenderer.invoke('git:log', repoPath, limit),
  gitDiff: (repoPath, file) => ipcRenderer.invoke('git:diff', repoPath, file),
  gitBranches: (repoPath) => ipcRenderer.invoke('git:branches', repoPath),
  gitCheckout: (repoPath, branch) => ipcRenderer.invoke('git:checkout', repoPath, branch),
  gitCreateBranch: (repoPath, branch) => ipcRenderer.invoke('git:createBranch', repoPath, branch),
  gitPull: (repoPath) => ipcRenderer.invoke('git:pull', repoPath),
  gitPush: (repoPath) => ipcRenderer.invoke('git:push', repoPath),
  gitDiscard: (repoPath, files) => ipcRenderer.invoke('git:discard', repoPath, files),
  gitInit: (repoPath) => ipcRenderer.invoke('git:init', repoPath),
  gitIsRepo: (repoPath) => ipcRenderer.invoke('git:isRepo', repoPath),

  // Specs
  parseSpecs: (specsPath) => ipcRenderer.invoke('specs:parse', specsPath),
  updateTaskStatus: (filePath, taskText, completed) => ipcRenderer.invoke('specs:updateTaskStatus', { filePath, taskText, completed }),

  // Search
  searchCode: (rootPath, query, options) => ipcRenderer.invoke('search:code', rootPath, query, options),
  searchFiles: (rootPath, query) => ipcRenderer.invoke('search:files', rootPath, query),

  // Autopilot
  executeAgent: (agent, prompt, cwd) => ipcRenderer.invoke('autopilot:execute', agent, prompt, cwd),
  respondToAgent: (agent, response) => ipcRenderer.invoke('autopilot:respond', agent, response),
  cancelAgent: (agent) => ipcRenderer.invoke('autopilot:cancel', agent),
  onAutopilotStream: (callback) => {
    const handler = (_: IpcRendererEvent, data: AutopilotStreamData) => callback(data)
    ipcRenderer.on('autopilot:stream', handler)
    return () => ipcRenderer.removeListener('autopilot:stream', handler)
  },

  // DevFlow
  checkDevFlow: (projectPath) => ipcRenderer.invoke('devflow:check', projectPath),
  setupDevFlow: (projectPath) => ipcRenderer.invoke('devflow:setup', projectPath),

  // Requirements
  checkRequirements: () => ipcRenderer.invoke('requirements:check'),
  recheckRequirement: (requirementId) => ipcRenderer.invoke('requirements:recheck', requirementId),

  // Project/Dialog
  selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  getRecentProjects: () => ipcRenderer.invoke('project:getRecent'),
  addRecentProject: (projectPath) => ipcRenderer.invoke('project:addRecent', projectPath),
  removeRecentProject: (projectPath) => ipcRenderer.invoke('project:removeRecent', projectPath),

  // App
  platform: process.platform,
  getVersion: () => ipcRenderer.invoke('app:version'),
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),

  // Menu events
  onMenuEvent: (event, callback) => {
    const handler = () => callback()
    ipcRenderer.on(`menu:${event}`, handler)
    return () => ipcRenderer.removeListener(`menu:${event}`, handler)
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)
