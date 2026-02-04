import { existsSync, readdirSync } from 'fs'
import { join } from 'path'
import os from 'os'

/**
 * Get extended PATH including nvm, homebrew, and common binary locations.
 * This ensures that CLI tools like `claude` and `git` can be found even
 * when the app is launched from Finder (which has a minimal PATH).
 */
export function getExtendedPath(): string {
  const home = os.homedir()
  const paths: string[] = []

  // Add nvm paths (find all installed node versions)
  const nvmDir = join(home, '.nvm', 'versions', 'node')
  if (existsSync(nvmDir)) {
    try {
      const versions = readdirSync(nvmDir)
      for (const version of versions) {
        const binPath = join(nvmDir, version, 'bin')
        if (existsSync(binPath)) {
          paths.push(binPath)
        }
      }
    } catch {
      // Ignore errors reading nvm directory
    }
  }

  // Add common paths
  paths.push('/usr/local/bin')
  paths.push('/opt/homebrew/bin')
  paths.push(join(home, '.local', 'bin'))
  paths.push(join(home, 'bin'))

  // Add existing PATH
  if (process.env.PATH) {
    paths.push(process.env.PATH)
  }

  return paths.join(':')
}
