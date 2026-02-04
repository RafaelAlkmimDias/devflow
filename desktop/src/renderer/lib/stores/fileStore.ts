import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FileNode, OpenFile } from '@/lib/types';
import { getExtension, getFileName, getLanguageFromExtension } from '@/lib/utils';
import { fileApi } from '@/infrastructure/api';
import {
  convertTree,
  sortOpenFiles,
  addToHistory,
  addToRecent,
  addToClosedTabs,
  getNextActiveFile,
  getTabsToClose,
} from './utils/fileStoreUtils';

interface FileState {
  // Core state
  tree: FileNode | null;
  treeVersion: number;
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

  // File operations
  loadTree: (projectPath: string) => Promise<void>;
  openFile: (path: string) => Promise<void>;
  closeFile: (path: string) => void;
  setActiveFile: (path: string | null) => void;
  updateFileContent: (path: string, content: string) => void;
  saveFile: (path: string) => Promise<void>;
  createFile: (path: string, type: 'file' | 'directory', content?: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  renameFile: (oldPath: string, newPath: string) => Promise<void>;

  // Folder operations
  toggleFolder: (path: string) => void;
  setExpandedFolders: (paths: Set<string>) => void;
  setScrollToLine: (line: number | null) => void;

  // Navigation actions
  navigateBack: () => void;
  navigateForward: () => void;
  canGoBack: () => boolean;
  canGoForward: () => boolean;

  // Tab management
  togglePinned: (path: string) => void;
  isPinned: (path: string) => boolean;
  getRecentFiles: () => string[];
  closeOtherTabs: (exceptPath: string) => void;
  closeTabsToRight: (path: string) => void;
  closeAllTabs: () => void;
  reopenClosedTab: () => void;
  copyPath: (path: string) => void;
}

export const useFileStore = create<FileState>()(
  persist(
    (set, get) => ({
      // Initial state
      tree: null,
      treeVersion: 0,
      openFiles: [],
      activeFile: null,
      expandedFolders: new Set(),
      isLoading: false,
      isSaving: false,
      savingFile: null,
      scrollToLine: null,
      pinnedFiles: [],
      tabHistory: [],
      historyIndex: -1,
      recentFiles: [],
      closedTabs: [],

      // === File Operations ===

      loadTree: async (projectPath: string) => {
        set({ isLoading: true });
        try {
          const treeData = await fileApi.getTree(projectPath);
          const root: FileNode = {
            name: projectPath.split('/').pop() || 'root',
            path: projectPath,
            type: 'directory',
            children: convertTree(treeData),
          };
          set((state) => ({ tree: root, treeVersion: state.treeVersion + 1, isLoading: false }));
        } catch (error) {
          console.error('Failed to load tree:', error);
          set({ isLoading: false });
        }
      },

      openFile: async (path: string) => {
        const { openFiles, tabHistory, historyIndex, recentFiles } = get();

        const navUpdate = {
          ...addToHistory(path, tabHistory, historyIndex),
          recentFiles: addToRecent(path, recentFiles),
        };

        // Already open - just activate
        if (openFiles.find((f) => f.path === path)) {
          set({ activeFile: path, ...navUpdate });
          return;
        }

        try {
          const content = await fileApi.read(path);
          const ext = getExtension(path);
          const newFile: OpenFile = {
            path,
            name: getFileName(path),
            content,
            originalContent: content,
            isDirty: false,
            language: getLanguageFromExtension(ext),
          };

          set((state) => ({
            openFiles: sortOpenFiles([...state.openFiles, newFile], state.pinnedFiles),
            activeFile: path,
            ...navUpdate,
          }));
        } catch (error) {
          console.error('Failed to open file:', error);
        }
      },

      closeFile: (path: string) => {
        set((state) => ({
          openFiles: state.openFiles.filter((f) => f.path !== path),
          activeFile: getNextActiveFile(path, state.openFiles, state.activeFile),
          closedTabs: addToClosedTabs(path, state.closedTabs),
          pinnedFiles: state.pinnedFiles.filter((f) => f !== path),
        }));
      },

      setActiveFile: (path: string | null) => set({ activeFile: path }),

      updateFileContent: (path: string, content: string) => {
        set((state) => ({
          openFiles: state.openFiles.map((f) =>
            f.path === path ? { ...f, content, isDirty: content !== f.originalContent } : f
          ),
        }));
      },

      saveFile: async (path: string) => {
        const file = get().openFiles.find((f) => f.path === path);
        if (!file) return;

        set({ isSaving: true, savingFile: path });
        try {
          await fileApi.write(path, file.content);
          set((state) => ({
            openFiles: state.openFiles.map((f) =>
              f.path === path ? { ...f, originalContent: f.content, isDirty: false } : f
            ),
            isSaving: false,
            savingFile: null,
          }));
        } catch (error) {
          set({ isSaving: false, savingFile: null });
          console.error('Failed to save file:', error);
        }
      },

      createFile: async (path: string, type: 'file' | 'directory', content?: string) => {
        try {
          await fileApi.create(path, type === 'directory');
          if (content && type === 'file') {
            await fileApi.write(path, content);
          }
        } catch (error) {
          console.error('Failed to create file:', error);
        }
      },

      deleteFile: async (path: string) => {
        try {
          await fileApi.delete(path);
          get().closeFile(path);
        } catch (error) {
          console.error('Failed to delete file:', error);
        }
      },

      renameFile: async (oldPath: string, newPath: string) => {
        try {
          await fileApi.rename(oldPath, newPath);
          const ext = getExtension(newPath);

          set((state) => ({
            openFiles: state.openFiles.map((f) =>
              f.path === oldPath
                ? { ...f, path: newPath, name: getFileName(newPath), language: getLanguageFromExtension(ext) }
                : f
            ),
            activeFile: state.activeFile === oldPath ? newPath : state.activeFile,
          }));
        } catch (error) {
          console.error('Failed to rename file:', error);
        }
      },

      // === Folder Operations ===

      toggleFolder: (path: string) => {
        set((state) => {
          const newExpanded = new Set(state.expandedFolders);
          newExpanded.has(path) ? newExpanded.delete(path) : newExpanded.add(path);
          return { expandedFolders: newExpanded };
        });
      },

      setExpandedFolders: (paths: Set<string>) => set({ expandedFolders: paths }),

      setScrollToLine: (line: number | null) => set({ scrollToLine: line }),

      // === Navigation ===

      navigateBack: () => {
        const { tabHistory, historyIndex } = get();
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          set({ historyIndex: newIndex, activeFile: tabHistory[newIndex] });
        }
      },

      navigateForward: () => {
        const { tabHistory, historyIndex } = get();
        if (historyIndex < tabHistory.length - 1) {
          const newIndex = historyIndex + 1;
          set({ historyIndex: newIndex, activeFile: tabHistory[newIndex] });
        }
      },

      canGoBack: () => get().historyIndex > 0,

      canGoForward: () => {
        const { tabHistory, historyIndex } = get();
        return historyIndex < tabHistory.length - 1;
      },

      // === Tab Management ===

      togglePinned: (path: string) => {
        set((state) => {
          const newPinnedFiles = state.pinnedFiles.includes(path)
            ? state.pinnedFiles.filter((f) => f !== path)
            : [...state.pinnedFiles, path];
          return {
            pinnedFiles: newPinnedFiles,
            openFiles: sortOpenFiles(state.openFiles, newPinnedFiles),
          };
        });
      },

      isPinned: (path: string) => get().pinnedFiles.includes(path),

      getRecentFiles: () => get().recentFiles,

      closeOtherTabs: (exceptPath: string) => {
        const { openFiles, pinnedFiles, closeFile } = get();
        getTabsToClose(openFiles, pinnedFiles, (f) => f.path !== exceptPath).forEach(closeFile);
      },

      closeTabsToRight: (path: string) => {
        const { openFiles, pinnedFiles, closeFile } = get();
        const index = openFiles.findIndex((f) => f.path === path);
        if (index !== -1) {
          getTabsToClose(openFiles, pinnedFiles, (_, i) => i > index).forEach(closeFile);
        }
      },

      closeAllTabs: () => {
        const { openFiles, pinnedFiles, closeFile } = get();
        getTabsToClose(openFiles, pinnedFiles, () => true).forEach(closeFile);
      },

      reopenClosedTab: () => {
        const { closedTabs, openFile } = get();
        if (closedTabs.length > 0) {
          const pathToReopen = closedTabs[0];
          set((state) => ({ closedTabs: state.closedTabs.slice(1) }));
          openFile(pathToReopen);
        }
      },

      copyPath: (path: string) => {
        navigator.clipboard.writeText(path).catch(() => console.error('Failed to copy path'));
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
