/**
 * Directories where specs/stories/ADRs can be found (relative to project root)
 */
export const SPEC_DIRECTORIES = [
  'docs/planning/stories',      // User stories
  'docs/planning',              // PRDs and specs
  'docs/decisions',             // ADRs
  '.devflow/specs',             // Legacy location
]

/**
 * Determine spec type from file path
 */
export function getSpecType(filePath: string): 'story' | 'adr' | 'spec' {
  const lowerPath = filePath.toLowerCase()

  if (lowerPath.includes('/stories/') || lowerPath.includes('us-') || lowerPath.includes('epic-')) {
    return 'story'
  }
  if (lowerPath.includes('/decisions/') || lowerPath.includes('adr-')) {
    return 'adr'
  }
  return 'spec'
}

/**
 * Sorting order for spec types
 */
export const SPEC_TYPE_ORDER: Record<string, number> = { story: 0, adr: 1, spec: 2 }

/**
 * Sorting order for priorities
 */
export const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

/**
 * Sorting order for statuses
 */
export const STATUS_ORDER: Record<string, number> = {
  'in-progress': 0,
  todo: 1,
  draft: 2,
  done: 3,
}
