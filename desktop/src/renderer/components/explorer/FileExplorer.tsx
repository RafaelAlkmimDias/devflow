import { useMemo, useCallback, useRef, KeyboardEvent, useState } from 'react';
import { useFileStore } from '@/lib/stores/fileStore';
import { useProjectStore } from '@/lib/stores/projectStore';
import { FileTree } from './FileTree';
import { SkeletonTree } from '@/components/ui/Skeleton';
import { RefreshCw, Plus, FolderPlus, Search, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FileNode } from '@/lib/types';
import { useTreeNavigation, TreeNode } from '@/hooks/useTreeNavigation';
import { toast } from 'sonner';

interface FlattenedNode extends TreeNode {
  node: FileNode;
  level: number;
}

// Flatten tree structure for keyboard navigation
function flattenTree(
  node: FileNode,
  expandedFolders: Set<string>,
  level: number = 0,
  parentId: string | null = null
): FlattenedNode[] {
  const result: FlattenedNode[] = [];

  // Skip root node itself, but process its children at level 0
  if (level === 0 && node.type === 'directory') {
    node.children?.forEach((child) => {
      result.push(...flattenTree(child, expandedFolders, 1, node.path));
    });
    return result;
  }

  result.push({
    id: node.path,
    parentId,
    isExpanded: expandedFolders.has(node.path),
    isDirectory: node.type === 'directory',
    node,
    level,
  });

  // Add children if expanded
  if (node.type === 'directory' && expandedFolders.has(node.path) && node.children) {
    node.children.forEach((child) => {
      result.push(...flattenTree(child, expandedFolders, level + 1, node.path));
    });
  }

  return result;
}

export function FileExplorer() {
  const { tree, treeVersion, isLoading, loadTree, expandedFolders, toggleFolder, openFile, createFile } = useFileStore();
  const { currentProject } = useProjectStore();
  const treeContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // State for creating new file/folder
  const [isCreating, setIsCreating] = useState<'file' | 'folder' | null>(null);
  const [newItemName, setNewItemName] = useState('');

  // Flatten tree for keyboard navigation
  const visibleNodes = useMemo(() => {
    if (!tree) return [];
    return flattenTree(tree, expandedFolders);
  }, [tree, expandedFolders]);

  // Handle node expansion
  const handleExpand = useCallback((flatNode: FlattenedNode) => {
    if (flatNode.isDirectory && !flatNode.isExpanded) {
      toggleFolder(flatNode.id);
    }
  }, [toggleFolder]);

  // Handle node collapse
  const handleCollapse = useCallback((flatNode: FlattenedNode) => {
    if (flatNode.isDirectory && flatNode.isExpanded) {
      toggleFolder(flatNode.id);
    }
  }, [toggleFolder]);

  // Handle node selection
  const handleSelect = useCallback((flatNode: FlattenedNode) => {
    if (flatNode.isDirectory) {
      toggleFolder(flatNode.id);
    } else {
      openFile(flatNode.id);
    }
  }, [toggleFolder, openFile]);

  // Tree navigation hook
  const {
    focusedNodeId,
    setFocusedNodeId,
    handleKeyDown,
    isFocused,
  } = useTreeNavigation({
    visibleNodes,
    onExpand: handleExpand,
    onCollapse: handleCollapse,
    onSelect: handleSelect,
    getNodeText: (node) => node.node.name,
  });

  const handleRefresh = () => {
    if (currentProject) {
      loadTree(currentProject.path);
    }
  };

  // Start creating a new file or folder
  const handleStartCreate = (type: 'file' | 'folder') => {
    setIsCreating(type);
    setNewItemName('');
    // Focus input after state update
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Cancel creation
  const handleCancelCreate = () => {
    setIsCreating(null);
    setNewItemName('');
  };

  // Get the target directory for creating new files/folders
  const getTargetDirectory = useCallback(() => {
    if (!currentProject) return null;

    // If no node is focused, use project root
    if (!focusedNodeId) return currentProject.path;

    // Find the focused node
    const focusedNode = visibleNodes.find(n => n.id === focusedNodeId);
    if (!focusedNode) return currentProject.path;

    // If focused node is a directory, create inside it
    if (focusedNode.isDirectory) {
      return focusedNodeId;
    }

    // If focused node is a file, create in its parent directory
    return focusedNodeId.substring(0, focusedNodeId.lastIndexOf('/'));
  }, [currentProject, focusedNodeId, visibleNodes]);

  // Confirm creation
  const handleConfirmCreate = async () => {
    if (!newItemName.trim() || !currentProject) {
      handleCancelCreate();
      return;
    }

    try {
      const targetDir = getTargetDirectory();
      if (!targetDir) {
        handleCancelCreate();
        return;
      }

      const newPath = `${targetDir}/${newItemName.trim()}`;
      await createFile(newPath, isCreating === 'folder' ? 'directory' : 'file', isCreating === 'file' ? '' : undefined);
      await loadTree(currentProject.path);
      toast.success(`${isCreating === 'file' ? 'File' : 'Folder'} created successfully`);
      handleCancelCreate();
    } catch (error) {
      toast.error(`Failed to create ${isCreating}`);
      console.error('Create error:', error);
    }
  };

  // Handle keyboard events on create input
  const handleCreateKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirmCreate();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelCreate();
    }
  };

  // Handle keyboard navigation on container
  const handleContainerKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    // Only handle if not in search input
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    handleKeyDown(e);
  }, [handleKeyDown]);

  // Handle click on empty area to deselect
  const handleContainerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Check if click was on a tree item (has role="treeitem" or is inside one)
    const target = e.target as HTMLElement;
    const isTreeItem = target.closest('[role="treeitem"]');

    // Deselect if clicking outside any tree item
    if (!isTreeItem) {
      setFocusedNodeId(null);
    }
  }, [setFocusedNodeId]);

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <span className="text-xs font-semibold uppercase text-gray-400 tracking-wider">
          Explorer
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            title="Refresh"
            aria-label="Refresh file tree"
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} aria-hidden="true" />
          </button>
          <button
            onClick={() => handleStartCreate('file')}
            className={cn(
              "p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors",
              isCreating === 'file' && "bg-purple-500/20 text-purple-400"
            )}
            title="New File"
            aria-label="Create new file"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            onClick={() => handleStartCreate('folder')}
            className={cn(
              "p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors",
              isCreating === 'folder' && "bg-purple-500/20 text-purple-400"
            )}
            title="New Folder"
            aria-label="Create new folder"
          >
            <FolderPlus className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Create Input */}
      {isCreating && (
        <div className="px-3 py-2 border-b border-white/10 bg-purple-500/5">
          <div className="flex items-center gap-2">
            <span className="text-purple-400">
              {isCreating === 'file' ? (
                <FileText className="w-4 h-4" />
              ) : (
                <FolderPlus className="w-4 h-4" />
              )}
            </span>
            <input
              ref={inputRef}
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={handleCreateKeyDown}
              onBlur={() => {
                // Delay to allow button click
                setTimeout(() => {
                  if (!newItemName.trim()) handleCancelCreate();
                }, 150);
              }}
              placeholder={isCreating === 'file' ? 'filename.ext' : 'folder name'}
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none border-b border-purple-500/50 py-1"
              autoFocus
            />
            <button
              onClick={handleCancelCreate}
              className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-gray-500 mt-1">
            Press Enter to create, Escape to cancel
          </p>
        </div>
      )}

      {/* Search */}
      <div className="px-3 py-2 border-b border-white/10">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg">
          <Search className="w-4 h-4 text-gray-500" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search files..."
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
            aria-label="Search files"
          />
        </div>
      </div>

      {/* File Tree */}
      <div
        ref={treeContainerRef}
        className="flex-1 overflow-auto py-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-purple-500/50"
        role="tree"
        aria-label="File explorer"
        tabIndex={0}
        onKeyDown={handleContainerKeyDown}
        onClick={handleContainerClick}
      >
        {isLoading && !tree ? (
          <div className="px-2">
            <SkeletonTree items={8} depth={3} />
          </div>
        ) : tree ? (
          <FileTree
            node={tree}
            level={0}
            treeVersion={treeVersion}
            focusedNodeId={focusedNodeId}
            onFocusNode={setFocusedNodeId}
            isFocused={isFocused}
          />
        ) : (
          <div className="p-4 text-center text-gray-500 text-sm">
            No files found
          </div>
        )}
      </div>
    </div>
  );
}
