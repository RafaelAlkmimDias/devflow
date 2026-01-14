import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FileNode, OpenFile } from '@/lib/types';
import { getExtension, getFileName, getLanguageFromExtension } from '@/lib/utils';
import { api } from '@/api';

const MAX_RECENT_FILES = 20;
const MAX_HISTORY_SIZE = 50;

interface FileState {
  // State
  tree: FileNode | null;
  openFiles: OpenFile[];
  activeFile: string | null;
  expandedFolders: Set<string>;
  isLoading: boolean;
  isSaving: boolean;
  savingFile: string | null;
  scrollToLine: number | null;

  // Navigation state
  pinnedFiles: string[];
  tabHistory: string[];
  historyIndex: number;
  recentFiles: string[];
  closedTabs: string[];

  // Actions
  loadTree: (projectPath: string) => Promise<void>;
  openFile: (path: string) => Promise<void>;
  closeFile: (path: string) => void;
  setActiveFile: (path: string | null) => void;
  updateFileContent: (path: string, content: string) => void;
  saveFile: (path: string) => Promise<void>;
  createFile: (path: string, type: 'file' | 'directory', content?: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  renameFile: (oldPath: string, newPath: string) => Promise<void>;
  toggleFolder: (path: string) => void;
  setExpandedFolders: (paths: Set<string>) => void;
  setScrollToLine: (line: number | null) => void;

  // Navigation actions
  navigateBack: () => void;
  navigateForward: () => void;
  canGoBack: () => boolean;
  canGoForward: () => boolean;
  togglePinned: (path: string) => void;
  isPinned: (path: string) => boolean;
  getRecentFiles: () => string[];
  closeOtherTabs: (exceptPath: string) => void;
  closeTabsToRight: (path: string) => void;
  closeAllTabs: () => void;
  reopenClosedTab: () => void;
  copyPath: (path: string) => void;
}

// Helper to convert IPC file tree to FileNode
function convertTree(nodes: { name: string; path: string; type: 'file' | 'directory'; children?: unknown[] }[]): FileNode[] {
  return nodes.map(node => ({
    name: node.name,
    path: node.path,
    type: node.type,
    extension: node.type === 'file' ? getExtension(node.name) : undefined,
    children: node.children ? convertTree(node.children as typeof nodes) : undefined,
  }));
}

export const useFileStore = create<FileState>()(
  persist(
    (set, get) => ({
      tree: null,
      openFiles: [],
      activeFile: null,
      expandedFolders: new Set(),
      isLoading: false,
      isSaving: false,
      savingFile: null,
      scrollToLine: null,

      // Navigation state
      pinnedFiles: [],
      tabHistory: [],
      historyIndex: -1,
      recentFiles: [],
      closedTabs: [],

      loadTree: async (projectPath: string) => {
        set({ isLoading: true });

        try {
          const treeData = await api.getFileTree(projectPath);
          const root: FileNode = {
            name: projectPath.split('/').pop() || 'root',
            path: projectPath,
            type: 'directory',
            children: convertTree(treeData),
          };
          set({ tree: root, isLoading: false });
        } catch (error) {
          console.error('Failed to load tree:', error);
          set({ isLoading: false });
        }
      },

      openFile: async (path: string) => {
        const { openFiles, pinnedFiles, tabHistory, historyIndex, recentFiles } = get();

        // Helper to add to history and recent
        const addToNavigation = () => {
          const newHistory = tabHistory.slice(0, historyIndex + 1);
          newHistory.push(path);
          if (newHistory.length > MAX_HISTORY_SIZE) {
            newHistory.shift();
          }

          const newRecent = [path, ...recentFiles.filter((f) => f !== path)].slice(0, MAX_RECENT_FILES);

          return {
            tabHistory: newHistory,
            historyIndex: newHistory.length - 1,
            recentFiles: newRecent,
          };
        };

        // Check if already open
        const existing = openFiles.find((f) => f.path === path);
        if (existing) {
          set({
            activeFile: path,
            ...addToNavigation(),
          });
          return;
        }

        try {
          const content = await api.readFile(path);

          const ext = getExtension(path);
          const newFile: OpenFile = {
            path,
            name: getFileName(path),
            content,
            originalContent: content,
            isDirty: false,
            language: getLanguageFromExtension(ext),
          };

          set((state) => {
            const newOpenFiles = [...state.openFiles, newFile];
            // Sort: pinned first
            newOpenFiles.sort((a, b) => {
              const aPinned = state.pinnedFiles.includes(a.path);
              const bPinned = state.pinnedFiles.includes(b.path);
              if (aPinned && !bPinned) return -1;
              if (!aPinned && bPinned) return 1;
              return 0;
            });

            return {
              openFiles: newOpenFiles,
              activeFile: path,
              ...addToNavigation(),
            };
          });
        } catch (error) {
          console.error('Failed to open file:', error);
        }
      },

      closeFile: (path: string) => {
        set((state) => {
          const newOpenFiles = state.openFiles.filter((f) => f.path !== path);
          let newActiveFile = state.activeFile;

          if (state.activeFile === path) {
            const index = state.openFiles.findIndex((f) => f.path === path);
            if (newOpenFiles.length > 0) {
              newActiveFile = newOpenFiles[Math.min(index, newOpenFiles.length - 1)].path;
            } else {
              newActiveFile = null;
            }
          }

          const newClosedTabs = [path, ...state.closedTabs.filter((f) => f !== path)].slice(0, 10);
          const newPinnedFiles = state.pinnedFiles.filter((f) => f !== path);

          return {
            openFiles: newOpenFiles,
            activeFile: newActiveFile,
            closedTabs: newClosedTabs,
            pinnedFiles: newPinnedFiles,
          };
        });
      },

      setActiveFile: (path: string | null) => {
        set({ activeFile: path });
      },

      updateFileContent: (path: string, content: string) => {
        set((state) => ({
          openFiles: state.openFiles.map((f) =>
            f.path === path
              ? {
                  ...f,
                  content,
                  isDirty: content !== f.originalContent,
                }
              : f
          ),
        }));
      },

      saveFile: async (path: string) => {
        const { openFiles } = get();
        const file = openFiles.find((f) => f.path === path);

        if (!file) return;

        set({ isSaving: true, savingFile: path });

        try {
          await api.writeFile(path, file.content);

          set((state) => ({
            openFiles: state.openFiles.map((f) =>
              f.path === path
                ? {
                    ...f,
                    originalContent: f.content,
                    isDirty: false,
                  }
                : f
            ),
            isSaving: false,
            savingFile: null,
          }));

          console.log('File saved:', getFileName(path));
        } catch (error) {
          set({ isSaving: false, savingFile: null });
          console.error('Failed to save file:', error);
        }
      },

      createFile: async (path: string, type: 'file' | 'directory', content?: string) => {
        try {
          await api.createFile(path, type === 'directory');
          if (content && type === 'file') {
            await api.writeFile(path, content);
          }
          console.log(`${type === 'directory' ? 'Folder' : 'File'} created:`, getFileName(path));
        } catch (error) {
          console.error('Failed to create file:', error);
        }
      },

      deleteFile: async (path: string) => {
        try {
          await api.deleteFile(path);
          get().closeFile(path);
          console.log('Deleted:', getFileName(path));
        } catch (error) {
          console.error('Failed to delete file:', error);
        }
      },

      renameFile: async (oldPath: string, newPath: string) => {
        try {
          await api.renameFile(oldPath, newPath);

          const { openFiles, activeFile } = get();
          const renamedFile = openFiles.find((f) => f.path === oldPath);

          if (renamedFile) {
            const ext = getExtension(newPath);
            set({
              openFiles: openFiles.map((f) =>
                f.path === oldPath
                  ? {
                      ...f,
                      path: newPath,
                      name: getFileName(newPath),
                      language: getLanguageFromExtension(ext),
                    }
                  : f
              ),
              activeFile: activeFile === oldPath ? newPath : activeFile,
            });
          }

          console.log('Renamed:', `${getFileName(oldPath)} → ${getFileName(newPath)}`);
        } catch (error) {
          console.error('Failed to rename file:', error);
        }
      },

      toggleFolder: (path: string) => {
        set((state) => {
          const newExpanded = new Set(state.expandedFolders);
          if (newExpanded.has(path)) {
            newExpanded.delete(path);
          } else {
            newExpanded.add(path);
          }
          return { expandedFolders: newExpanded };
        });
      },

      setExpandedFolders: (paths: Set<string>) => {
        set({ expandedFolders: paths });
      },

      setScrollToLine: (line: number | null) => {
        set({ scrollToLine: line });
      },

      // Navigation actions
      navigateBack: () => {
        const { tabHistory, historyIndex } = get();
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          const path = tabHistory[newIndex];
          set({ historyIndex: newIndex, activeFile: path });
        }
      },

      navigateForward: () => {
        const { tabHistory, historyIndex } = get();
        if (historyIndex < tabHistory.length - 1) {
          const newIndex = historyIndex + 1;
          const path = tabHistory[newIndex];
          set({ historyIndex: newIndex, activeFile: path });
        }
      },

      canGoBack: () => {
        const { historyIndex } = get();
        return historyIndex > 0;
      },

      canGoForward: () => {
        const { tabHistory, historyIndex } = get();
        return historyIndex < tabHistory.length - 1;
      },

      togglePinned: (path: string) => {
        set((state) => {
          const isPinned = state.pinnedFiles.includes(path);
          const newPinnedFiles = isPinned
            ? state.pinnedFiles.filter((f) => f !== path)
            : [...state.pinnedFiles, path];

          const newOpenFiles = [...state.openFiles].sort((a, b) => {
            const aPinned = newPinnedFiles.includes(a.path);
            const bPinned = newPinnedFiles.includes(b.path);
            if (aPinned && !bPinned) return -1;
            if (!aPinned && bPinned) return 1;
            return 0;
          });

          return {
            pinnedFiles: newPinnedFiles,
            openFiles: newOpenFiles,
          };
        });
      },

      isPinned: (path: string) => {
        return get().pinnedFiles.includes(path);
      },

      getRecentFiles: () => {
        return get().recentFiles;
      },

      closeOtherTabs: (exceptPath: string) => {
        const { openFiles, pinnedFiles } = get();

        const tabsToClose = openFiles
          .filter((f) => f.path !== exceptPath && !pinnedFiles.includes(f.path))
          .map((f) => f.path);

        tabsToClose.forEach((path) => {
          get().closeFile(path);
        });
      },

      closeTabsToRight: (path: string) => {
        const { openFiles, pinnedFiles } = get();
        const index = openFiles.findIndex((f) => f.path === path);

        if (index === -1) return;

        const tabsToClose = openFiles
          .slice(index + 1)
          .filter((f) => !pinnedFiles.includes(f.path))
          .map((f) => f.path);

        tabsToClose.forEach((tabPath) => {
          get().closeFile(tabPath);
        });
      },

      closeAllTabs: () => {
        const { openFiles, pinnedFiles } = get();

        const tabsToClose = openFiles
          .filter((f) => !pinnedFiles.includes(f.path))
          .map((f) => f.path);

        tabsToClose.forEach((path) => {
          get().closeFile(path);
        });
      },

      reopenClosedTab: () => {
        const { closedTabs, openFile } = get();

        if (closedTabs.length === 0) {
          return;
        }

        const pathToReopen = closedTabs[0];

        set((state) => ({
          closedTabs: state.closedTabs.slice(1),
        }));

        openFile(pathToReopen);
      },

      copyPath: (path: string) => {
        navigator.clipboard.writeText(path).then(() => {
          console.log('Path copied:', path);
        }).catch(() => {
          console.error('Failed to copy path');
        });
      },
    }),
    {
      name: 'devflow-file-store',
      partialize: (state) => ({
        pinnedFiles: state.pinnedFiles,
        recentFiles: state.recentFiles,
        closedTabs: state.closedTabs,
      }),
    }
  )
);
