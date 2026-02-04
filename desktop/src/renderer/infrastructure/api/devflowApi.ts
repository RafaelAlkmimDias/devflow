import type { DevFlowStatus, DevFlowSetupResult } from '@shared/types'

export interface DevFlowUpdateResult {
  success: boolean
  error?: string
  updatedAgents: string[]
}

/**
 * DevFlow project management API operations
 */
export const devflowApi = {
  check: (projectPath: string): Promise<DevFlowStatus> => {
    return window.electronAPI.checkDevFlow(projectPath)
  },

  setup: (projectPath: string): Promise<DevFlowSetupResult> => {
    return window.electronAPI.setupDevFlow(projectPath)
  },

  update: (projectPath: string): Promise<DevFlowUpdateResult> => {
    return window.electronAPI.updateDevFlow(projectPath)
  },
}
