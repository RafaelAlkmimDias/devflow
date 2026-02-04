import { useMemo } from 'react';
import {
  Search,
  FileText,
  GitBranch,
  Terminal,
  Moon,
  Sun,
  FolderOpen,
  Save,
  Eye,
  EyeOff,
  LayoutPanelLeft,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { createElement } from 'react';
import { useUIStore } from '@/lib/stores/uiStore';
import { useFileStore } from '@/lib/stores/fileStore';
import type { CommandItem } from './types';

export function useCommands() {
  const { closeModal, openModal } = useUIStore();
  const {
    toggleSidebar,
    sidebarVisible,
    toggleTerminal,
    terminalVisible,
    togglePreview,
    previewVisible,
    toggleTerminalMaximized,
    terminalMaximized,
    setTheme,
    setActivePanel,
  } = useUIStore();

  const { activeFile, saveFile } = useFileStore();

  const commands: CommandItem[] = useMemo(() => [
    // File Commands
    {
      id: 'quick-open',
      label: 'Go to File',
      description: 'Quickly open a file by name',
      icon: createElement(Search, { className: 'w-4 h-4' }),
      shortcut: 'Cmd+P',
      category: 'File',
      action: () => {
        closeModal();
        setTimeout(() => openModal('quickOpen'), 50);
      },
    },
    {
      id: 'global-search',
      label: 'Search in Files',
      description: 'Search text in all files',
      icon: createElement(FileText, { className: 'w-4 h-4' }),
      shortcut: 'Cmd+Shift+F',
      category: 'File',
      action: () => {
        closeModal();
        setTimeout(() => openModal('globalSearch'), 50);
      },
    },
    {
      id: 'save-file',
      label: 'Save File',
      description: 'Save the current file',
      icon: createElement(Save, { className: 'w-4 h-4' }),
      shortcut: 'Cmd+S',
      category: 'File',
      action: () => {
        if (activeFile) {
          saveFile(activeFile);
        }
        closeModal();
      },
    },

    // View Commands
    {
      id: 'toggle-sidebar',
      label: sidebarVisible ? 'Hide Sidebar' : 'Show Sidebar',
      icon: createElement(LayoutPanelLeft, { className: 'w-4 h-4' }),
      shortcut: 'Cmd+B',
      category: 'View',
      action: () => {
        toggleSidebar();
        closeModal();
      },
    },
    {
      id: 'toggle-terminal',
      label: terminalVisible ? 'Hide Terminal' : 'Show Terminal',
      icon: createElement(Terminal, { className: 'w-4 h-4' }),
      shortcut: 'Cmd+`',
      category: 'View',
      action: () => {
        toggleTerminal();
        closeModal();
      },
    },
    {
      id: 'toggle-terminal-max',
      label: terminalMaximized ? 'Restore Terminal' : 'Maximize Terminal',
      icon: terminalMaximized
        ? createElement(Minimize2, { className: 'w-4 h-4' })
        : createElement(Maximize2, { className: 'w-4 h-4' }),
      category: 'View',
      action: () => {
        toggleTerminalMaximized();
        closeModal();
      },
    },
    {
      id: 'toggle-preview',
      label: previewVisible ? 'Hide Preview' : 'Show Preview',
      icon: previewVisible
        ? createElement(EyeOff, { className: 'w-4 h-4' })
        : createElement(Eye, { className: 'w-4 h-4' }),
      shortcut: 'Cmd+Shift+V',
      category: 'View',
      action: () => {
        togglePreview();
        closeModal();
      },
    },

    // Panel Commands
    {
      id: 'show-explorer',
      label: 'Show Explorer',
      icon: createElement(FolderOpen, { className: 'w-4 h-4' }),
      category: 'Panels',
      action: () => {
        setActivePanel('explorer');
        closeModal();
      },
    },
    {
      id: 'show-git',
      label: 'Show Source Control',
      icon: createElement(GitBranch, { className: 'w-4 h-4' }),
      category: 'Panels',
      action: () => {
        setActivePanel('git');
        closeModal();
      },
    },
    {
      id: 'show-specs',
      label: 'Show Specs',
      icon: createElement(FileText, { className: 'w-4 h-4' }),
      category: 'Panels',
      action: () => {
        setActivePanel('specs');
        closeModal();
      },
    },

    // Theme Commands
    {
      id: 'theme-dark',
      label: 'Dark Theme',
      icon: createElement(Moon, { className: 'w-4 h-4' }),
      category: 'Preferences',
      action: () => {
        setTheme('dark');
        closeModal();
      },
    },
    {
      id: 'theme-light',
      label: 'Light Theme',
      icon: createElement(Sun, { className: 'w-4 h-4' }),
      category: 'Preferences',
      action: () => {
        setTheme('light');
        closeModal();
      },
    },
  ], [
    activeFile, saveFile, sidebarVisible, terminalVisible,
    previewVisible, terminalMaximized, closeModal, openModal,
    toggleSidebar, toggleTerminal, togglePreview,
    toggleTerminalMaximized, setTheme, setActivePanel
  ]);

  return commands;
}
