import { useState, useCallback, useEffect, KeyboardEvent, useRef } from 'react';

/**
 * Custom hook for keyboard navigation in tree structures (like file explorers).
 * Implements accessible tree navigation per WAI-ARIA TreeView pattern.
 */

export interface TreeNode {
  id: string;
  parentId: string | null;
  isExpanded?: boolean;
  isDirectory?: boolean;
}

interface UseTreeNavigationOptions<T extends TreeNode> {
  visibleNodes: T[];
  onExpand?: (node: T) => void;
  onCollapse?: (node: T) => void;
  onSelect?: (node: T) => void;
  onEscape?: () => void;
  loop?: boolean;
  typeAhead?: boolean;
  getNodeText?: (node: T) => string;
}

interface UseTreeNavigationReturn<T extends TreeNode> {
  focusedNodeId: string | null;
  setFocusedNodeId: (id: string | null) => void;
  handleKeyDown: (event: KeyboardEvent) => void;
  isFocused: (id: string) => boolean;
  getContainerProps: () => {
    role: 'tree';
    'aria-label': string;
    tabIndex: number;
    onKeyDown: (event: KeyboardEvent) => void;
  };
  getItemProps: (node: T) => {
    role: 'treeitem';
    'aria-expanded'?: boolean;
    'aria-selected': boolean;
    'aria-level': number;
    tabIndex: number;
    id: string;
  };
  focusNext: () => void;
  focusPrevious: () => void;
  focusFirst: () => void;
  focusLast: () => void;
  reset: () => void;
}

export function useTreeNavigation<T extends TreeNode>({
  visibleNodes,
  onExpand,
  onCollapse,
  onSelect,
  onEscape,
  loop = false,
  typeAhead = true,
  getNodeText = (node) => node.id,
}: UseTreeNavigationOptions<T>): UseTreeNavigationReturn<T> {
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(
    visibleNodes.length > 0 ? visibleNodes[0].id : null
  );
  const [searchString, setSearchString] = useState('');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getFocusedIndex = useCallback(() => {
    if (!focusedNodeId) return -1;
    return visibleNodes.findIndex((node) => node.id === focusedNodeId);
  }, [focusedNodeId, visibleNodes]);

  useEffect(() => {
    if (visibleNodes.length === 0) {
      setFocusedNodeId(null);
      return;
    }

    const focusedIndex = getFocusedIndex();
    if (focusedIndex === -1 && focusedNodeId) {
      setFocusedNodeId(visibleNodes[0].id);
    }
  }, [visibleNodes, focusedNodeId, getFocusedIndex]);

  const focusNext = useCallback(() => {
    const currentIndex = getFocusedIndex();
    if (visibleNodes.length === 0) return;

    if (currentIndex === -1) {
      setFocusedNodeId(visibleNodes[0].id);
    } else if (currentIndex < visibleNodes.length - 1) {
      setFocusedNodeId(visibleNodes[currentIndex + 1].id);
    } else if (loop) {
      setFocusedNodeId(visibleNodes[0].id);
    }
  }, [visibleNodes, getFocusedIndex, loop]);

  const focusPrevious = useCallback(() => {
    const currentIndex = getFocusedIndex();
    if (visibleNodes.length === 0) return;

    if (currentIndex === -1) {
      setFocusedNodeId(visibleNodes[visibleNodes.length - 1].id);
    } else if (currentIndex > 0) {
      setFocusedNodeId(visibleNodes[currentIndex - 1].id);
    } else if (loop) {
      setFocusedNodeId(visibleNodes[visibleNodes.length - 1].id);
    }
  }, [visibleNodes, getFocusedIndex, loop]);

  const focusFirst = useCallback(() => {
    if (visibleNodes.length > 0) {
      setFocusedNodeId(visibleNodes[0].id);
    }
  }, [visibleNodes]);

  const focusLast = useCallback(() => {
    if (visibleNodes.length > 0) {
      setFocusedNodeId(visibleNodes[visibleNodes.length - 1].id);
    }
  }, [visibleNodes]);

  const reset = useCallback(() => {
    setFocusedNodeId(visibleNodes.length > 0 ? visibleNodes[0].id : null);
    setSearchString('');
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
  }, [visibleNodes]);

  const getFocusedNode = useCallback(() => {
    const index = getFocusedIndex();
    return index >= 0 ? visibleNodes[index] : null;
  }, [getFocusedIndex, visibleNodes]);

  const handleExpand = useCallback(() => {
    const node = getFocusedNode();
    if (!node) return;

    if (node.isDirectory) {
      if (node.isExpanded) {
        focusNext();
      } else if (onExpand) {
        onExpand(node);
      }
    }
  }, [getFocusedNode, focusNext, onExpand]);

  const handleCollapse = useCallback(() => {
    const node = getFocusedNode();
    if (!node) return;

    if (node.isDirectory && node.isExpanded && onCollapse) {
      onCollapse(node);
    } else if (node.parentId) {
      setFocusedNodeId(node.parentId);
    }
  }, [getFocusedNode, onCollapse]);

  const handleSelect = useCallback(() => {
    const node = getFocusedNode();
    if (node && onSelect) {
      onSelect(node);
    }
  }, [getFocusedNode, onSelect]);

  const handleTypeAhead = useCallback(
    (char: string) => {
      if (!typeAhead) return false;

      const newSearchString = searchString + char.toLowerCase();
      setSearchString(newSearchString);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        setSearchString('');
      }, 500);

      const currentIndex = getFocusedIndex();
      const startIndex = currentIndex >= 0 ? currentIndex : 0;

      for (let i = startIndex; i < visibleNodes.length; i++) {
        const text = getNodeText(visibleNodes[i]).toLowerCase();
        if (text.startsWith(newSearchString)) {
          setFocusedNodeId(visibleNodes[i].id);
          return true;
        }
      }

      for (let i = 0; i < startIndex; i++) {
        const text = getNodeText(visibleNodes[i]).toLowerCase();
        if (text.startsWith(newSearchString)) {
          setFocusedNodeId(visibleNodes[i].id);
          return true;
        }
      }

      return false;
    },
    [typeAhead, searchString, getFocusedIndex, visibleNodes, getNodeText]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          focusNext();
          break;

        case 'ArrowUp':
          event.preventDefault();
          focusPrevious();
          break;

        case 'ArrowRight':
          event.preventDefault();
          handleExpand();
          break;

        case 'ArrowLeft':
          event.preventDefault();
          handleCollapse();
          break;

        case 'Home':
          event.preventDefault();
          focusFirst();
          break;

        case 'End':
          event.preventDefault();
          focusLast();
          break;

        case 'Enter':
        case ' ':
          event.preventDefault();
          handleSelect();
          break;

        case 'Escape':
          event.preventDefault();
          if (onEscape) {
            onEscape();
          }
          break;

        default:
          if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            if (handleTypeAhead(event.key)) {
              event.preventDefault();
            }
          }
          break;
      }
    },
    [focusNext, focusPrevious, handleExpand, handleCollapse, focusFirst, focusLast, handleSelect, onEscape, handleTypeAhead]
  );

  const isFocused = useCallback(
    (id: string) => id === focusedNodeId,
    [focusedNodeId]
  );

  const getNodeDepth = useCallback((node: T): number => {
    let depth = 1;
    let current = node;
    while (current.parentId) {
      depth++;
      const parent = visibleNodes.find((n) => n.id === current.parentId);
      if (!parent) break;
      current = parent;
    }
    return depth;
  }, [visibleNodes]);

  const getContainerProps = useCallback(() => ({
    role: 'tree' as const,
    'aria-label': 'File Explorer',
    tabIndex: 0,
    onKeyDown: handleKeyDown,
  }), [handleKeyDown]);

  const getItemProps = useCallback((node: T) => ({
    role: 'treeitem' as const,
    'aria-expanded': node.isDirectory ? node.isExpanded : undefined,
    'aria-selected': isFocused(node.id),
    'aria-level': getNodeDepth(node),
    tabIndex: isFocused(node.id) ? 0 : -1,
    id: `tree-item-${node.id}`,
  }), [isFocused, getNodeDepth]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return {
    focusedNodeId,
    setFocusedNodeId,
    handleKeyDown,
    isFocused,
    getContainerProps,
    getItemProps,
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast,
    reset,
  };
}
