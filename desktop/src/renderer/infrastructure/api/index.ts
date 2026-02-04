// Infrastructure API layer - domain-specific API modules
// These provide typed wrappers around the Electron IPC calls

export { fileApi } from './fileApi'
export { gitApi } from './gitApi'
export { agentApi } from './agentApi'
export { terminalApi } from './terminalApi'
export { specsApi } from './specsApi'
export { devflowApi } from './devflowApi'
export { searchApi } from './searchApi'
export { projectApi } from './projectApi'
export { requirementsApi } from './requirementsApi'
export { appApi } from './appApi'

// Re-export types from shared
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
  Requirement,
  RequirementsStatus,
  AutopilotStreamData,
} from '@shared/types'
