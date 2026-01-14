// Re-export the electron API with proper types
// This file provides the bridge between React components and Electron IPC

import type { ElectronAPI } from '../../preload/index'

// Declare the global electronAPI
declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

// Export the API instance
export const api = window.electronAPI

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
} from '../../shared/types'
