import type { DevFlowStatus, DevFlowSetupResult } from '@shared/types'

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
}
