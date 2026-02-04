import { exec } from 'child_process'
import { promisify } from 'util'
import { shell } from 'electron'
import { getExtendedPath } from '../domain/common/PathUtils'

const execAsync = promisify(exec)

export interface Requirement {
  id: string
  name: string
  description: string
  required: boolean
  status: 'checking' | 'installed' | 'not_installed' | 'error'
  version?: string
  installInstructions: {
    darwin: string
    linux: string
    win32: string
  }
  helpUrl?: string
}

export interface RequirementsStatus {
  allRequiredMet: boolean
  platform: NodeJS.Platform
  requirements: Requirement[]
}

/**
 * Service responsible for checking system requirements.
 * Validates that required tools like Claude CLI and Git are installed.
 */
export class RequirementsService {
  /**
   * Check if a command exists and get its version
   */
  private async checkCommand(
    command: string,
    versionFlag: string = '--version'
  ): Promise<{ exists: boolean; version?: string }> {
    try {
      const { stdout } = await execAsync(`${command} ${versionFlag}`, {
        timeout: 10000,
        env: {
          ...process.env,
          PATH: getExtendedPath(),
        },
      })
      const versionMatch = stdout.match(/(\d+\.\d+(\.\d+)?)/)
      return {
        exists: true,
        version: versionMatch ? versionMatch[1] : stdout.trim().split('\n')[0],
      }
    } catch {
      return { exists: false }
    }
  }

  /**
   * Get requirement definitions with installation instructions
   */
  private getRequirementDefinitions(): Record<string, Requirement> {
    return {
      claude: {
        id: 'claude',
        name: 'Claude CLI',
        description: 'Required for AI agents to function. Must be installed and authenticated.',
        required: true,
        status: 'checking',
        installInstructions: {
          darwin: `# Install via npm
npm install -g @anthropic-ai/claude-code

# Then authenticate
claude login`,
          linux: `# Install via npm
npm install -g @anthropic-ai/claude-code

# Then authenticate
claude login`,
          win32: `# Install via npm (in PowerShell)
npm install -g @anthropic-ai/claude-code

# Then authenticate
claude login`,
        },
        helpUrl: 'https://docs.anthropic.com/claude-code',
      },
      git: {
        id: 'git',
        name: 'Git',
        description: 'Version control system. Required for source control features.',
        required: true,
        status: 'checking',
        installInstructions: {
          darwin: `# Install via Homebrew
brew install git

# Or via Xcode Command Line Tools
xcode-select --install`,
          linux: `# Debian/Ubuntu
sudo apt-get install -y git

# Fedora/RHEL
sudo dnf install -y git

# Arch
sudo pacman -S git`,
          win32: `# Download from official website
https://git-scm.com/download/win

# Or via winget
winget install Git.Git`,
        },
        helpUrl: 'https://git-scm.com/downloads',
      },
      node: {
        id: 'node',
        name: 'Node.js',
        description: 'JavaScript runtime. Version 18+ required.',
        required: false,
        status: 'checking',
        installInstructions: {
          darwin: `# Install via Homebrew
brew install node

# Or via nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20`,
          linux: `# Debian/Ubuntu (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Fedora
sudo dnf install -y nodejs`,
          win32: `# Download from official website
https://nodejs.org/

# Or via winget
winget install OpenJS.NodeJS.LTS`,
        },
        helpUrl: 'https://nodejs.org/',
      },
    }
  }

  /**
   * Check all system requirements
   */
  async check(): Promise<RequirementsStatus> {
    const platform = process.platform
    const requirementDefs = this.getRequirementDefinitions()
    const requirements: Requirement[] = []

    // Check Claude CLI
    const claudeReq = { ...requirementDefs.claude }
    try {
      const claudeCheck = await this.checkCommand('claude', '--version')
      claudeReq.status = claudeCheck.exists ? 'installed' : 'not_installed'
      claudeReq.version = claudeCheck.version
    } catch {
      claudeReq.status = 'not_installed'
    }
    requirements.push(claudeReq)

    // Check Git
    const gitReq = { ...requirementDefs.git }
    try {
      const gitCheck = await this.checkCommand('git', '--version')
      gitReq.status = gitCheck.exists ? 'installed' : 'not_installed'
      gitReq.version = gitCheck.version
    } catch {
      gitReq.status = 'not_installed'
    }
    requirements.push(gitReq)

    // Check Node.js
    const nodeReq = { ...requirementDefs.node }
    try {
      const nodeCheck = await this.checkCommand('node', '--version')
      nodeReq.status = nodeCheck.exists ? 'installed' : 'not_installed'
      nodeReq.version = nodeCheck.version
    } catch {
      nodeReq.status = 'not_installed'
    }
    requirements.push(nodeReq)

    const allRequiredMet = requirements
      .filter((r) => r.required)
      .every((r) => r.status === 'installed')

    return {
      allRequiredMet,
      platform,
      requirements,
    }
  }

  /**
   * Re-check a single requirement
   */
  async recheck(requirementId: string): Promise<Requirement | null> {
    const requirementDefs = this.getRequirementDefinitions()
    const def = requirementDefs[requirementId]

    if (!def) return null

    const req = { ...def }

    try {
      let check: { exists: boolean; version?: string }

      switch (requirementId) {
        case 'claude':
          check = await this.checkCommand('claude', '--version')
          break
        case 'git':
          check = await this.checkCommand('git', '--version')
          break
        case 'node':
          check = await this.checkCommand('node', '--version')
          break
        default:
          return null
      }

      req.status = check.exists ? 'installed' : 'not_installed'
      req.version = check.version
    } catch {
      req.status = 'not_installed'
    }

    return req
  }

  /**
   * Open help URL in default browser
   */
  async openHelp(url: string): Promise<void> {
    await shell.openExternal(url)
  }
}

// Singleton instance
export const requirementsService = new RequirementsService()
