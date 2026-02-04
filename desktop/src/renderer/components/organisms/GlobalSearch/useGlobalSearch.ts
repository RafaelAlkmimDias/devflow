import { useState, useEffect, useCallback } from 'react';
import { useProjectStore } from '@/lib/stores/projectStore';
import { searchApi } from '@/infrastructure/api';
import type { GroupedResult } from './types';

interface UseGlobalSearchOptions {
  isOpen: boolean;
  caseSensitive: boolean;
}

export function useGlobalSearch({ isOpen, caseSensitive }: UseGlobalSearchOptions) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GroupedResult[]>([]);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [totalMatches, setTotalMatches] = useState(0);

  const { currentProject } = useProjectStore();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setExpandedFiles(new Set());
      setTotalMatches(0);
    }
  }, [isOpen]);

  // Search content
  const searchContent = useCallback(async (searchQuery: string) => {
    if (!currentProject || !searchQuery.trim()) {
      setResults([]);
      setTotalMatches(0);
      return;
    }

    setIsLoading(true);
    try {
      const searchResults = await searchApi.searchCode(currentProject.path, searchQuery, {
        caseSensitive,
        maxResults: 100,
      });

      // Group results by file
      const grouped = new Map<string, GroupedResult>();

      for (const result of searchResults) {
        const existing = grouped.get(result.file);
        if (existing) {
          existing.matches.push({
            line: result.line,
            content: result.content,
            match: result.match,
          });
        } else {
          const fileName = result.file.split('/').pop() || result.file;
          const relativePath = result.file.replace(currentProject.path + '/', '');
          grouped.set(result.file, {
            filePath: result.file,
            relativePath,
            fileName,
            matches: [{
              line: result.line,
              content: result.content,
              match: result.match,
            }],
          });
        }
      }

      const groupedResults = Array.from(grouped.values());
      setResults(groupedResults);
      setTotalMatches(searchResults.length);

      // Auto-expand first few results
      const firstFiles = groupedResults.slice(0, 3).map((r) => r.filePath);
      setExpandedFiles(new Set(firstFiles));
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentProject, caseSensitive]);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      searchContent(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, isOpen, searchContent]);

  const toggleFile = useCallback((filePath: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  }, []);

  return {
    query,
    setQuery,
    results,
    expandedFiles,
    isLoading,
    totalMatches,
    toggleFile,
  };
}
