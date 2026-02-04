import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useFileStore } from '@/lib/stores/fileStore';
import { useProjectStore } from '@/lib/stores/projectStore';
import type { FileNode } from '@/lib/types';
import { cn } from '@/lib/utils';
import { FileContextMenu } from './FileContextMenu';
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  FileText,
  FileCode,
  FileJson,
  Bot,
  ListTodo,
  Scale,
  Settings
} from 'lucide-react';

interface FileTreeProps {
  node: FileNode;
  level: number;
  treeVersion: number;
  focusedNodeId?: string | null;
  onFocusNode?: (id: string) => void;
  isFocused?: (id: string) => boolean;
}

// Zustand selectors
const selectExpandedFolders = (state: ReturnType<typeof useFileStore.getState>) => state.expandedFolders;
const selectToggleFolder = (state: ReturnType<typeof useFileStore.getState>) => state.toggleFolder;
const selectOpenFile = (state: ReturnType<typeof useFileStore.getState>) => state.openFile;
const selectActiveFile = (state: ReturnType<typeof useFileStore.getState>) => state.activeFile;
const selectRenameFile = (state: ReturnType<typeof useFileStore.getState>) => state.renameFile;
const selectLoadTree = (state: ReturnType<typeof useFileStore.getState>) => state.loadTree;

// Get icon based on file type
function getFileIcon(node: FileNode) {
  if (node.type === 'directory') {
    if (node.name === '.devflow') return Settings;
    if (node.name === 'agents') return Bot;
    if (node.name === 'stories') return ListTodo;
    if (node.name === 'decisions') return Scale;
    return Folder;
  }

  switch (node.extension) {
    case 'md':
      return FileText;
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
      return FileCode;
    case 'json':
      return FileJson;
    case 'yaml':
    case 'yml':
      return Settings;
    default:
      return File;
  }
}

// Get icon color based on file type
function getIconColor(node: FileNode): string {
  if (node.type === 'directory') return 'text-amber-400';

  switch (node.extension) {
    case 'md':
      return 'text-blue-400';
    case 'ts':
    case 'tsx':
      return 'text-blue-500';
    case 'js':
    case 'jsx':
      return 'text-yellow-400';
    case 'json':
      return 'text-amber-400';
    case 'yaml':
    case 'yml':
      return 'text-purple-400';
    default:
      return 'text-gray-400';
  }
}

function FileTreeComponent({ node, level, treeVersion, focusedNodeId, onFocusNode, isFocused }: FileTreeProps) {
  const expandedFolders = useFileStore(selectExpandedFolders);
  const toggleFolder = useFileStore(selectToggleFolder);
  const openFile = useFileStore(selectOpenFile);
  const activeFile = useFileStore(selectActiveFile);
  const renameFile = useFileStore(selectRenameFile);
  const loadTree = useFileStore(selectLoadTree);
  const { currentProject } = useProjectStore();
  const itemRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const isExpanded = expandedFolders.has(node.path);
  const isActive = activeFile === node.path;
  const isNodeFocused = isFocused ? isFocused(node.path) : false;
  const Icon = getFileIcon(node);
  const iconColor = getIconColor(node);

  // Scroll focused item into view
  useEffect(() => {
    if (isNodeFocused && itemRef.current) {
      itemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isNodeFocused]);

  const handleClick = useCallback(() => {
    if (onFocusNode) {
      onFocusNode(node.path);
    }

    if (node.type === 'directory') {
      toggleFolder(node.path);
    } else {
      openFile(node.path);
    }
  }, [node.path, node.type, onFocusNode, toggleFolder, openFile]);

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', node.path);
    e.dataTransfer.effectAllowed = 'move';
  }, [node.path]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    // Only allow drop on directories
    if (node.type !== 'directory') return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const sourcePath = e.dataTransfer.getData('text/plain');
    // Don't allow dropping on itself or its children
    if (sourcePath && (node.path === sourcePath || node.path.startsWith(sourcePath + '/'))) {
      return;
    }

    setIsDragOver(true);
  }, [node.path, node.type]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only reset if leaving the element (not entering a child)
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (node.type !== 'directory') return;

    const sourcePath = e.dataTransfer.getData('text/plain');
    if (!sourcePath) return;

    // Don't allow dropping on itself or its children
    if (node.path === sourcePath || node.path.startsWith(sourcePath + '/')) {
      return;
    }

    // Get the file/folder name from the source path
    const fileName = sourcePath.split('/').pop();
    if (!fileName) return;

    const newPath = `${node.path}/${fileName}`;

    // Don't move if destination is the same
    if (sourcePath === newPath) return;

    try {
      await renameFile(sourcePath, newPath);
      if (currentProject) {
        await loadTree(currentProject.path);
      }
    } catch (error) {
      console.error('Failed to move file:', error);
    }
  }, [node.path, node.type, renameFile, loadTree, currentProject]);

  // Don't render root node name, just children
  if (level === 0 && node.type === 'directory') {
    return (
      <div className="py-1" role="group">
        {node.children?.map((child) => (
          <FileTree
            key={child.path}
            node={child}
            level={1}
            treeVersion={treeVersion}
            focusedNodeId={focusedNodeId}
            onFocusNode={onFocusNode}
            isFocused={isFocused}
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      <FileContextMenu node={node}>
        <div
          ref={itemRef}
          className={cn(
            'flex items-center gap-1 py-1 px-2 cursor-pointer transition-colors',
            'text-gray-400 hover:text-white hover:bg-white/5',
            isNodeFocused && 'ring-1 ring-inset ring-purple-500/50 bg-purple-500/10',
            isDragOver && 'bg-purple-500/30 ring-2 ring-purple-500'
          )}
          style={{ paddingLeft: (level * 12 + 8) + 'px' }}
          onClick={handleClick}
          draggable
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          role="treeitem"
          aria-expanded={node.type === 'directory' ? isExpanded : undefined}
          aria-selected={isActive}
          aria-level={level}
          tabIndex={isNodeFocused ? 0 : -1}
          id={'tree-item-' + node.path.replace(/[^a-zA-Z0-9]/g, '-')}
        >
          {/* Expand/collapse arrow for directories */}
          {node.type === 'directory' ? (
            <span className="w-4 h-4 flex items-center justify-center text-gray-500" aria-hidden="true">
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </span>
          ) : (
            <span className="w-4" aria-hidden="true" />
          )}

          {/* Icon */}
          {node.type === 'directory' && isExpanded ? (
            <FolderOpen className={cn('w-4 h-4 flex-shrink-0', iconColor)} aria-hidden="true" />
          ) : (
            <Icon className={cn('w-4 h-4 flex-shrink-0', iconColor)} aria-hidden="true" />
          )}

          {/* Name */}
          <span className={cn(
            'text-sm truncate',
            isActive && 'font-semibold text-sky-400'
          )}>{node.name}</span>
        </div>
      </FileContextMenu>

      {/* Children */}
      {node.type === 'directory' && isExpanded && node.children && (
        <div role="group" aria-label={'Contents of ' + node.name}>
          {node.children.map((child) => (
            <FileTree
              key={child.path}
              node={child}
              level={level + 1}
              treeVersion={treeVersion}
              focusedNodeId={focusedNodeId}
              onFocusNode={onFocusNode}
              isFocused={isFocused}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Memoized FileTree with treeVersion for efficient re-renders
export const FileTree = memo(FileTreeComponent, (prevProps, nextProps) => {
  return (
    prevProps.node.path === nextProps.node.path &&
    prevProps.node.name === nextProps.node.name &&
    prevProps.node.type === nextProps.node.type &&
    prevProps.level === nextProps.level &&
    prevProps.treeVersion === nextProps.treeVersion &&
    prevProps.focusedNodeId === nextProps.focusedNodeId &&
    prevProps.onFocusNode === nextProps.onFocusNode &&
    prevProps.isFocused === nextProps.isFocused
  );
});
