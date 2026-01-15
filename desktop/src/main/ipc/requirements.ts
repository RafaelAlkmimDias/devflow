import { ipcMain } from 'electron'
import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync, readdirSync } from 'fs'
import { join } from 'path'
import os from 'os'

const execAsync = promisify(exec)

// Get extended PATH including nvm, homebrew, etc.
function getExtendedPath(): string {
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

// Check if a command exists and get its version
async function checkCommand(
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
    // Extract version from output (usually first line, first version-like string)
    const versionMatch = stdout.match(/(\d+\.\d+(\.\d+)?)/);
    return {
      exists: true,
      version: versionMatch ? versionMatch[1] : stdout.trim().split('\n')[0],
    }
  } catch {
    return { exists: false }
  }
}

// Check Claude CLI authentication status
async function checkClaudeAuth(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('claude --version', {
      timeout: 5000,
      env: {
        ...process.env,
        PATH: getExtendedPath(),
      },
    })
    return stdout.includes('claude') || stdout.includes('Claude')
  } catch {
    return false
  }
}

// Get installation instructions based on platform
function getInstallInstructions(): Record<string, Requirement> {
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
      required: false, // Not strictly required for desktop app (it's bundled)
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

export function registerRequirementsHandlers(): void {
  // Check all system requirements
  ipcMain.handle('requirements:check', async (): Promise<RequirementsStatus> => {
    const platform = process.platform
    const requirementDefs = getInstallInstructions()
    const requirements: Requirement[] = []

    // Check Claude CLI
    const claudeReq = { ...requirementDefs.claude }
    try {
      const claudeCheck = await checkCommand('claude', '--version')
      if (claudeCheck.exists) {
        claudeReq.status = 'installed'
        claudeReq.version = claudeCheck.version
      } else {
        claudeReq.status = 'not_installed'
      }
    } catch {
      claudeReq.status = 'not_installed'
    }
    requirements.push(claudeReq)

    // Check Git
    const gitReq = { ...requirementDefs.git }
    try {
      const gitCheck = await checkCommand('git', '--version')
      if (gitCheck.exists) {
        gitReq.status = 'installed'
        gitReq.version = gitCheck.version
      } else {
        gitReq.status = 'not_installed'
      }
    } catch {
      gitReq.status = 'not_installed'
    }
    requirements.push(gitReq)

    // Check Node.js (informational, not blocking)
    const nodeReq = { ...requirementDefs.node }
    try {
      const nodeCheck = await checkCommand('node', '--version')
      if (nodeCheck.exists) {
        nodeReq.status = 'installed'
        nodeReq.version = nodeCheck.version
      } else {
        nodeReq.status = 'not_installed'
      }
    } catch {
      nodeReq.status = 'not_installed'
    }
    requirements.push(nodeReq)

    // Check if all required requirements are met
    const allRequiredMet = requirements
      .filter((r) => r.required)
      .every((r) => r.status === 'installed')

    return {
      allRequiredMet,
      platform,
      requirements,
    }
  })

  // Re-check a single requirement
  ipcMain.handle('requirements:recheck', async (_, requirementId: string): Promise<Requirement | null> => {
    const requirementDefs = getInstallInstructions()
    const def = requirementDefs[requirementId]

    if (!def) return null

    const req = { ...def }

    try {
      let check: { exists: boolean; version?: string }

      switch (requirementId) {
        case 'claude':
          check = await checkCommand('claude', '--version')
          break
        case 'git':
          check = await checkCommand('git', '--version')
          break
        case 'node':
          check = await checkCommand('node', '--version')
          break
        default:
          return null
      }

      if (check.exists) {
        req.status = 'installed'
        req.version = check.version
      } else {
        req.status = 'not_installed'
      }
    } catch {
      req.status = 'not_installed'
    }

    return req
  })

  // Open URL in default browser (for help links)
  ipcMain.handle('requirements:openHelp', async (_, url: string): Promise<void> => {
    const { shell } = await import('electron')
    await shell.openExternal(url)
  })
}
