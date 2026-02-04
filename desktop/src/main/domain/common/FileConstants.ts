/**
 * Directories to ignore when building file tree
 */
export const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '__pycache__',
  '.cache',
  '.vscode',
  '.idea',
  'coverage',
  '.nyc_output',
  '.turbo',
])

/**
 * Files to ignore when building file tree
 */
export const IGNORED_FILES = new Set(['.DS_Store', 'Thumbs.db', '.gitkeep'])

/**
 * Maximum depth for recursive file tree traversal
 */
export const MAX_TREE_DEPTH = 10
