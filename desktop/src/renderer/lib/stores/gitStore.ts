import { create } from 'zustand';
import { gitApi } from '@/infrastructure/api';
import type { GitStatus, GitCommit, GitBranch } from '@/lib/types';

interface GitState {
  // State
  status: GitStatus | null;
  commits: GitCommit[];
  branches: GitBranch[];
  currentBranch: string | null;
  isLoading: boolean;
  error: string | null;
  selectedFiles: Set<string>;
  diffContent: string | null;
  diffFile: string | null;
  isRepo: boolean | null;

  // Actions
  fetchStatus: (projectPath: string) => Promise<void>;
  fetchLog: (projectPath: string, maxCount?: number) => Promise<void>;
  fetchBranches: (projectPath: string) => Promise<void>;
  fetchDiff: (projectPath: string, file?: string) => Promise<void>;
  stageFiles: (projectPath: string, files: string[]) => Promise<boolean>;
  unstageFiles: (projectPath: string, files: string[]) => Promise<boolean>;
  stageAll: (projectPath: string) => Promise<boolean>;
  unstageAll: (projectPath: string) => Promise<boolean>;
  discardChanges: (projectPath: string, files: string[]) => Promise<boolean>;
  initRepo: (projectPath: string) => Promise<{ success: boolean; error?: string }>;
  commit: (projectPath: string, message: string) => Promise<{ success: boolean; error?: string }>;
  push: (projectPath: string) => Promise<{ success: boolean; error?: string }>;
  pull: (projectPath: string) => Promise<{ success: boolean; error?: string }>;
  checkout: (projectPath: string, branch: string) => Promise<{ success: boolean; error?: string }>;
  createBranch: (projectPath: string, branch: string) => Promise<{ success: boolean; error?: string }>;
  toggleFileSelection: (file: string) => void;
  selectAllFiles: (files: string[]) => void;
  clearSelection: () => void;
  clearDiff: () => void;
  setError: (error: string | null) => void;
}

export const useGitStore = create<GitState>((set, get) => ({
  // Initial state
  status: null,
  commits: [],
  branches: [],
  currentBranch: null,
  isLoading: false,
  error: null,
  selectedFiles: new Set(),
  diffContent: null,
  diffFile: null,
  isRepo: null,

  // Actions
  fetchStatus: async (projectPath: string) => {
    set({ isLoading: true, error: null });
    try {
      // Check if directory is a git repo
      const isRepo = await gitApi.isRepo(projectPath);
      if (!isRepo) {
        set({
          isRepo: false,
          status: null,
          isLoading: false,
        });
        return;
      }

      const status = await gitApi.getStatus(projectPath);
      set({
        status,
        currentBranch: status.current,
        isLoading: false,
        isRepo: true,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch status',
        isLoading: false,
        isRepo: false,
      });
    }
  },

  fetchLog: async (projectPath: string, maxCount: number = 50) => {
    try {
      const commits = await gitApi.getLog(projectPath, maxCount);
      set({ commits });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch log' });
    }
  },

  fetchBranches: async (projectPath: string) => {
    try {
      const result = await gitApi.getBranches(projectPath);
      set({
        branches: result.branches,
        currentBranch: result.current,
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch branches' });
    }
  },

  fetchDiff: async (projectPath: string, file?: string) => {
    try {
      const diff = await gitApi.getDiff(projectPath, file);
      set({ diffContent: diff, diffFile: file || null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch diff' });
    }
  },

  stageFiles: async (projectPath: string, files: string[]) => {
    try {
      await gitApi.stage(projectPath, files);
      await get().fetchStatus(projectPath);
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to stage files' });
      return false;
    }
  },

  unstageFiles: async (projectPath: string, files: string[]) => {
    try {
      await gitApi.unstage(projectPath, files);
      await get().fetchStatus(projectPath);
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to unstage files' });
      return false;
    }
  },

  stageAll: async (projectPath: string) => {
    const status = get().status;
    if (!status) return false;

    const allFiles = [
      ...status.modified,
      ...status.not_added,
      ...status.deleted,
    ];

    if (allFiles.length === 0) return true;

    try {
      await gitApi.stage(projectPath, allFiles);
      await get().fetchStatus(projectPath);
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to stage all files' });
      return false;
    }
  },

  unstageAll: async (projectPath: string) => {
    const status = get().status;
    if (!status || status.staged.length === 0) return true;

    try {
      await gitApi.unstage(projectPath, status.staged);
      await get().fetchStatus(projectPath);
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to unstage all files' });
      return false;
    }
  },

  discardChanges: async (projectPath: string, files: string[]) => {
    try {
      await gitApi.discard(projectPath, files);
      await get().fetchStatus(projectPath);
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to discard changes' });
      return false;
    }
  },

  initRepo: async (projectPath: string) => {
    set({ isLoading: true });
    try {
      await gitApi.init(projectPath);
      await get().fetchStatus(projectPath);
      set({ isLoading: false });
      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to initialize repository';
      set({ error: errorMsg, isLoading: false });
      return { success: false, error: errorMsg };
    }
  },

  commit: async (projectPath: string, message: string) => {
    set({ isLoading: true });
    try {
      await gitApi.commit(projectPath, message);
      await get().fetchStatus(projectPath);
      await get().fetchLog(projectPath);
      set({ isLoading: false });
      console.log('Changes committed:', message.substring(0, 50));
      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to commit';
      set({ error: errorMsg, isLoading: false });
      return { success: false, error: errorMsg };
    }
  },

  push: async (projectPath: string) => {
    set({ isLoading: true });
    try {
      await gitApi.push(projectPath);
      await get().fetchStatus(projectPath);
      set({ isLoading: false });
      console.log('Pushed to remote');
      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to push';
      set({ error: errorMsg, isLoading: false });
      return { success: false, error: errorMsg };
    }
  },

  pull: async (projectPath: string) => {
    set({ isLoading: true });
    try {
      await gitApi.pull(projectPath);
      await get().fetchStatus(projectPath);
      await get().fetchLog(projectPath);
      set({ isLoading: false });
      console.log('Pulled from remote');
      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to pull';
      set({ error: errorMsg, isLoading: false });
      return { success: false, error: errorMsg };
    }
  },

  checkout: async (projectPath: string, branch: string) => {
    set({ isLoading: true });
    try {
      await gitApi.checkout(projectPath, branch);
      await get().fetchStatus(projectPath);
      await get().fetchBranches(projectPath);
      set({ isLoading: false });
      console.log('Branch switched:', branch);
      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to checkout';
      set({ error: errorMsg, isLoading: false });
      return { success: false, error: errorMsg };
    }
  },

  createBranch: async (projectPath: string, branch: string) => {
    set({ isLoading: true });
    try {
      await gitApi.createBranch(projectPath, branch);
      await get().fetchStatus(projectPath);
      await get().fetchBranches(projectPath);
      set({ isLoading: false });
      console.log('Branch created:', branch);
      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to create branch';
      set({ error: errorMsg, isLoading: false });
      return { success: false, error: errorMsg };
    }
  },

  toggleFileSelection: (file: string) => {
    const { selectedFiles } = get();
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(file)) {
      newSelection.delete(file);
    } else {
      newSelection.add(file);
    }
    set({ selectedFiles: newSelection });
  },

  selectAllFiles: (files: string[]) => {
    set({ selectedFiles: new Set(files) });
  },

  clearSelection: () => {
    set({ selectedFiles: new Set() });
  },

  clearDiff: () => {
    set({ diffContent: null, diffFile: null });
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));
