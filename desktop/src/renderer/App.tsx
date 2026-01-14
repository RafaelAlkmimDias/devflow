import { useEffect, useState, useCallback } from 'react';
import { api, DevFlowStatus, RequirementsStatus } from './api';
import { useProjectStore } from '@/lib/stores/projectStore';
import { useFileStore } from '@/lib/stores/fileStore';
import { useUIStore } from '@/lib/stores/uiStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Sidebar } from '@/components/layout/Sidebar';
import { StatusBar } from '@/components/layout/StatusBar';
import { EditorPanel } from '@/components/editor/EditorPanel';
import { TerminalPanel } from '@/components/terminal/TerminalPanel';
import { ResizeHandle } from '@/components/ui/ResizeHandle';
import { cn } from '@/lib/utils';
import {
  FolderTree,
  FileText,
  Terminal,
  LayoutDashboard,
  Zap,
  Settings,
  GitBranch,
  FolderOpen,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Toaster } from 'sonner';
import { GitPanel } from '@/components/git';
import { QuickOpen, GlobalSearch, CommandPalette, DevFlowSetupModal, RequirementsModal } from '@/components/modals';
import { SettingsPanel } from '@/components/settings';

// Project Selector Component
function ProjectSelector({
  onSelectProject,
  recentProjects,
  version,
}: {
  onSelectProject: (path: string) => void;
  recentProjects: string[];
  version: string;
}) {
  const handleOpenProject = async () => {
    const path = await api.selectDirectory();
    if (path) {
      onSelectProject(path);
    }
  };

  const isMac = api.platform === 'darwin';

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      {/* Titlebar / Drag Region for macOS */}
      {isMac && (
        <div
          className="h-9 flex-shrink-0"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        />
      )}

      {/* Content centered */}
      <div className="flex-1 flex flex-col items-center justify-center">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center">
            <Zap className="w-7 h-7 text-white" />
          </div>
        </div>
        <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent">
          DevFlow
        </h1>
        <p className="text-gray-400 text-lg">AI-assisted Development IDE</p>
        {version && (
          <p className="mt-2 text-xs text-gray-500">v{version}</p>
        )}
      </div>

      <div className="relative z-10 max-w-md w-full px-6">
        {/* Open Project Card */}
        <div className="bg-[#12121a] border border-white/10 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-2 mb-4">
            <FolderOpen className="w-5 h-5 text-purple-400" />
            <span className="font-medium">Open Project</span>
          </div>

          <button
            onClick={handleOpenProject}
            className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            Select Folder
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Recent Projects */}
          {recentProjects.length > 0 && (
            <div className="mt-6 pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                <Clock className="w-4 h-4" />
                Recent Projects
              </div>
              <div className="space-y-1">
                {recentProjects.map((path) => (
                  <button
                    key={path}
                    onClick={() => onSelectProject(path)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors truncate"
                  >
                    {path.split('/').pop()}
                    <span className="text-gray-600 ml-2 text-xs">{path}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="relative z-10 mt-8 text-xs text-gray-600">
        Platform: {api.platform}
      </p>
      </div>
    </div>
  );
}

// Main IDE Component
function IDE({ projectPath }: { projectPath: string }) {
  const { loadTree } = useFileStore();
  const { setProject } = useProjectStore();
  const { openSettings } = useSettingsStore();

  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

  const {
    sidebarVisible,
    sidebarWidth,
    activePanel,
    setActivePanel,
    terminalVisible,
    terminalHeight,
    terminalMaximized,
    toggleSidebar,
    toggleTerminal,
    toggleTerminalMaximized,
    setSidebarWidth,
    setTerminalHeight,
  } = useUIStore();

  // Resize handler
  const handleSidebarResize = useCallback((delta: number) => {
    setSidebarWidth(sidebarWidth + delta);
  }, [sidebarWidth, setSidebarWidth]);

  // Load project data
  useEffect(() => {
    const projectName = projectPath.split('/').pop() || 'Project';
    setProject({
      path: projectPath,
      name: projectName,
      stats: { stories: 0, adrs: 0, specs: 0, agents: 0 },
    });
    loadTree(projectPath);
  }, [projectPath, loadTree, setProject]);

  const sidebarItems = [
    { id: 'explorer', icon: FolderTree, label: 'Explorer' },
    { id: 'git', icon: GitBranch, label: 'Source Control' },
    { id: 'specs', icon: FileText, label: 'Specs' },
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  ] as const;

  const isMac = api.platform === 'darwin';

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0f] text-white overflow-hidden">
      {/* Titlebar / Drag Region for macOS */}
      {isMac && (
        <div
          className="h-9 bg-[#08080c] border-b border-white/10 flex items-center justify-center flex-shrink-0"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <span className="text-xs text-gray-500 select-none">DevFlow</span>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar */}
        <div className="w-12 bg-[#08080c] border-r border-white/10 flex flex-col items-center py-2">
          {/* Logo */}
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg flex items-center justify-center mb-4">
            <Zap className="w-4 h-4 text-white" />
          </div>

          {/* Nav Items */}
          <div className="flex-1 flex flex-col gap-1">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (activePanel === item.id && sidebarVisible) {
                    toggleSidebar();
                  } else {
                    setActivePanel(item.id);
                    if (!sidebarVisible) toggleSidebar();
                  }
                }}
                className={cn(
                  'w-10 h-10 flex items-center justify-center rounded-lg transition-colors',
                  activePanel === item.id && sidebarVisible
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'text-gray-500 hover:text-white hover:bg-white/5'
                )}
                title={item.label}
              >
                <item.icon className="w-5 h-5" />
              </button>
            ))}
          </div>

          {/* Bottom Actions */}
          <div className="flex flex-col gap-1">
            <button
              onClick={toggleTerminal}
              className={cn(
                'w-10 h-10 flex items-center justify-center rounded-lg transition-colors',
                terminalVisible
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'text-gray-500 hover:text-white hover:bg-white/5'
              )}
              title="Terminal (Ctrl+`)"
            >
              <Terminal className="w-5 h-5" />
            </button>
            <button
              onClick={openSettings}
              className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
              title="Settings (Cmd+,)"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sidebar Panel */}
        {sidebarVisible && (
          <>
            <aside
              className="h-full bg-[#0a0a0f] flex-shrink-0 overflow-hidden"
              style={{ width: sidebarWidth }}
            >
              {activePanel === 'explorer' && <Sidebar />}
              {activePanel === 'git' && (
                <GitPanel projectPath={projectPath} />
              )}
              {activePanel === 'specs' && (
                <div className="p-4 text-gray-500 text-sm">Specs Panel (coming soon)</div>
              )}
              {activePanel === 'dashboard' && (
                <div className="p-4 text-gray-500 text-sm">Dashboard (coming soon)</div>
              )}
            </aside>
            <ResizeHandle
              direction="horizontal"
              side="right"
              onResize={handleSidebarResize}
              className="bg-white/5 hover:bg-purple-500/30"
            />
          </>
        )}

        {/* Editor + Terminal Area */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Editor */}
          <div className={cn(
            'flex-1 min-h-0',
            terminalVisible && !terminalMaximized && 'pb-0'
          )}>
            <EditorPanel />
          </div>

          {/* Terminal */}
          {terminalVisible && (
            <TerminalPanel
              projectPath={projectPath}
              isMaximized={terminalMaximized}
              onToggleMaximize={toggleTerminalMaximized}
              onClose={toggleTerminal}
              height={terminalHeight}
              onHeightChange={setTerminalHeight}
            />
          )}
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar />
    </div>
  );
}

// Main App Component
function App() {
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [recentProjects, setRecentProjects] = useState<string[]>([]);
  const [version, setVersion] = useState<string>('');

  // Requirements check state
  const [isCheckingRequirements, setIsCheckingRequirements] = useState(true);
  const [requirementsStatus, setRequirementsStatus] = useState<RequirementsStatus | null>(null);
  const [showRequirementsModal, setShowRequirementsModal] = useState(false);

  // DevFlow setup modal state
  const [showDevFlowSetup, setShowDevFlowSetup] = useState(false);
  const [devFlowStatus, setDevFlowStatus] = useState<DevFlowStatus | null>(null);
  const [pendingProjectPath, setPendingProjectPath] = useState<string | null>(null);

  // Check system requirements on app startup
  useEffect(() => {
    const checkRequirements = async () => {
      try {
        const status = await api.checkRequirements();
        setRequirementsStatus(status);

        if (!status.allRequiredMet) {
          // Show blocking modal if requirements not met
          setShowRequirementsModal(true);
        }
      } catch (error) {
        console.error('Failed to check requirements:', error);
        // If check fails, allow user to continue but log error
      } finally {
        setIsCheckingRequirements(false);
      }
    };

    checkRequirements();
  }, []);

  useEffect(() => {
    // Load initial data (only after requirements check passes)
    if (!isCheckingRequirements && (!requirementsStatus || requirementsStatus.allRequiredMet || !showRequirementsModal)) {
      api.getVersion().then(setVersion);
      api.getRecentProjects().then(setRecentProjects);
    }
  }, [isCheckingRequirements, requirementsStatus, showRequirementsModal]);

  const handleRequirementsRecheck = async () => {
    try {
      const status = await api.checkRequirements();
      setRequirementsStatus(status);

      if (status.allRequiredMet) {
        // All requirements met, can close modal
        setShowRequirementsModal(false);
      }
    } catch (error) {
      console.error('Failed to recheck requirements:', error);
    }
  };

  const handleRequirementsMet = () => {
    setShowRequirementsModal(false);
  };

  const handleSelectProject = async (path: string) => {
    // Check DevFlow status first
    try {
      const status = await api.checkDevFlow(path);

      if (!status.isDevFlowProject) {
        // Project doesn't have DevFlow, show setup modal
        setPendingProjectPath(path);
        setDevFlowStatus(status);
        setShowDevFlowSetup(true);
      } else {
        // Project has DevFlow, open directly
        completeProjectOpen(path);
      }
    } catch (error) {
      // If check fails, open project anyway
      console.error('DevFlow check failed:', error);
      completeProjectOpen(path);
    }
  };

  const completeProjectOpen = async (path: string) => {
    setProjectPath(path);
    await api.addRecentProject(path);
    setRecentProjects(await api.getRecentProjects());
  };

  const handleDevFlowSetupComplete = () => {
    setShowDevFlowSetup(false);
    if (pendingProjectPath) {
      completeProjectOpen(pendingProjectPath);
      setPendingProjectPath(null);
    }
    setDevFlowStatus(null);
  };

  const handleDevFlowSetupSkip = () => {
    setShowDevFlowSetup(false);
    if (pendingProjectPath) {
      completeProjectOpen(pendingProjectPath);
      setPendingProjectPath(null);
    }
    setDevFlowStatus(null);
  };

  // Show loading screen while checking requirements
  if (isCheckingRequirements) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center mb-4 animate-pulse">
          <Zap className="w-7 h-7 text-white" />
        </div>
        <p className="text-gray-400 text-sm">Checking system requirements...</p>
      </div>
    );
  }

  return (
    <>
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1a1a24',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#fff',
          },
        }}
      />
      {projectPath ? (
        <IDE projectPath={projectPath} />
      ) : (
        <ProjectSelector
          onSelectProject={handleSelectProject}
          recentProjects={recentProjects}
          version={version}
        />
      )}
      {/* Modals */}
      <QuickOpen />
      <GlobalSearch />
      <CommandPalette />
      <SettingsPanel />

      {/* DevFlow Setup Modal */}
      {pendingProjectPath && devFlowStatus && (
        <DevFlowSetupModal
          isOpen={showDevFlowSetup}
          projectPath={pendingProjectPath}
          status={devFlowStatus}
          onClose={handleDevFlowSetupSkip}
          onSetupComplete={handleDevFlowSetupComplete}
        />
      )}

      {/* Requirements Modal (blocking) */}
      {requirementsStatus && (
        <RequirementsModal
          isOpen={showRequirementsModal}
          status={requirementsStatus}
          onRequirementsMet={handleRequirementsMet}
          onRecheck={handleRequirementsRecheck}
        />
      )}
    </>
  );
}

export default App;
