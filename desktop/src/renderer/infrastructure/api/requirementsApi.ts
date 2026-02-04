import type { Requirement, RequirementsStatus } from '@shared/types'

/**
 * Requirements checking API operations
 */
export const requirementsApi = {
  check: (): Promise<RequirementsStatus> => {
    return window.electronAPI.checkRequirements()
  },

  recheck: (requirementId: string): Promise<Requirement | null> => {
    return window.electronAPI.recheckRequirement(requirementId)
  },
}
