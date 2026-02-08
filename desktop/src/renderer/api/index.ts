// Re-export the electron API with proper types
// This file provides the bridge between React components and Electron IPC

import type {
  FileTreeNode,
  FileStats,
  GitStatus,
  GitCommit,
  GitBranches,
  Spec,
  SearchOptions,
  SearchResult,
  DevFlowStatus,
  DevFlowSetupResult,
  AgentVersionInfo,
  Requirement,
  RequirementsStatus,
  AutopilotStreamData,
} from '@shared/types'

// Re-export types for convenience
export type {
  FileTreeNode,
  FileStats,
  GitStatus,
  GitCommit,
  GitBranches,
  Spec,
  SearchOptions,
  SearchResult,
  DevFlowStatus,
  DevFlowSetupResult,
  AgentVersionInfo,
  Requirement,
  RequirementsStatus,
  AutopilotStreamData,
}

// API interface matching the preload exposed API
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

  // Autopilot (single-session API)
  startAutopilotSession: (cwd: string) => Promise<void>
  sendAgentPrompt: (agent: string, prompt: string) => Promise<string>
  sendAgentResponse: (response: string) => Promise<void>
  cancelCurrentAgent: () => Promise<void>
  endAutopilotSession: () => Promise<void>

  // Autopilot (legacy API)
  executeAgent: (agent: string, prompt: string, cwd: string) => Promise<string>
  respondToAgent: (agent: string, response: string) => Promise<void>
  cancelAgent: (agent: string) => Promise<void>
  onAutopilotStream: (callback: (data: AutopilotStreamData) => void) => () => void

  // DevFlow
  checkDevFlow: (projectPath: string) => Promise<DevFlowStatus>
  setupDevFlow: (projectPath: string) => Promise<DevFlowSetupResult>
  updateDevFlow: (projectPath: string) => Promise<{ success: boolean; error?: string; updatedAgents: string[] }>

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

  // Notifications
  notifyCompleted: (agentName?: string) => Promise<void>
  notifyFailed: (error?: string) => Promise<void>
  notifyQuestion: (agentName: string) => Promise<void>
  notifyAwaitingInput: (agentName: string) => Promise<void>

  // Power management
  powerStartBlocking: () => Promise<boolean>
  powerStopBlocking: () => Promise<void>
  powerIsBlocking: () => Promise<boolean>

  // Menu events
  onMenuEvent: (event: string, callback: () => void) => () => void
}

// Declare the global electronAPI
declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

// Export the API instance
export const api = window.electronAPI
