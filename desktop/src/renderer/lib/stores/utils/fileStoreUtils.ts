import type { FileNode, OpenFile } from '@/lib/types';
import { getExtension } from '@/lib/utils';

export const MAX_RECENT_FILES = 20;
export const MAX_HISTORY_SIZE = 50;
export const MAX_CLOSED_TABS = 10;

/**
 * Convert IPC file tree to FileNode
 */
export function convertTree(
  nodes: { name: string; path: string; type: 'file' | 'directory'; children?: unknown[] }[]
): FileNode[] {
  return nodes.map((node) => ({
    name: node.name,
    path: node.path,
    type: node.type,
    extension: node.type === 'file' ? getExtension(node.name) : undefined,
    children: node.children ? convertTree(node.children as typeof nodes) : undefined,
  }));
}

/**
 * Sort open files with pinned files first
 */
export function sortOpenFiles(openFiles: OpenFile[], pinnedFiles: string[]): OpenFile[] {
  return [...openFiles].sort((a, b) => {
    const aPinned = pinnedFiles.includes(a.path);
    const bPinned = pinnedFiles.includes(b.path);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return 0;
  });
}

/**
 * Add path to navigation history
 */
export function addToHistory(
  path: string,
  tabHistory: string[],
  historyIndex: number
): { tabHistory: string[]; historyIndex: number } {
  const newHistory = tabHistory.slice(0, historyIndex + 1);
  newHistory.push(path);
  if (newHistory.length > MAX_HISTORY_SIZE) {
    newHistory.shift();
  }
  return {
    tabHistory: newHistory,
    historyIndex: newHistory.length - 1,
  };
}

/**
 * Add path to recent files list
 */
export function addToRecent(path: string, recentFiles: string[]): string[] {
  return [path, ...recentFiles.filter((f) => f !== path)].slice(0, MAX_RECENT_FILES);
}

/**
 * Add path to closed tabs list
 */
export function addToClosedTabs(path: string, closedTabs: string[]): string[] {
  return [path, ...closedTabs.filter((f) => f !== path)].slice(0, MAX_CLOSED_TABS);
}

/**
 * Find next active file after closing a tab
 */
export function getNextActiveFile(
  closedPath: string,
  openFiles: OpenFile[],
  currentActive: string | null
): string | null {
  if (currentActive !== closedPath) {
    return currentActive;
  }

  const newOpenFiles = openFiles.filter((f) => f.path !== closedPath);
  if (newOpenFiles.length === 0) {
    return null;
  }

  const index = openFiles.findIndex((f) => f.path === closedPath);
  return newOpenFiles[Math.min(index, newOpenFiles.length - 1)].path;
}

/**
 * Get tabs to close (excluding pinned)
 */
export function getTabsToClose(
  openFiles: OpenFile[],
  pinnedFiles: string[],
  filter: (file: OpenFile, index: number) => boolean
): string[] {
  return openFiles
    .filter((f, i) => filter(f, i) && !pinnedFiles.includes(f.path))
    .map((f) => f.path);
}
