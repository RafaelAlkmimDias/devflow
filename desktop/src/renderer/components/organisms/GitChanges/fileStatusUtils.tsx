import { FilePlus, FileX, FileEdit, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FileStatus = 'added' | 'modified' | 'deleted' | 'renamed' | 'copied';

export function getFileStatusIcon(status: FileStatus) {
  switch (status) {
    case 'added':
      return <FilePlus className="w-4 h-4 text-green-400" />;
    case 'deleted':
      return <FileX className="w-4 h-4 text-red-400" />;
    case 'modified':
      return <FileEdit className="w-4 h-4 text-yellow-400" />;
    case 'renamed':
    case 'copied':
      return <FileText className="w-4 h-4 text-blue-400" />;
    default:
      return <FileText className="w-4 h-4 text-gray-400" />;
  }
}

const badges: Record<FileStatus, { text: string; color: string }> = {
  added: { text: 'A', color: 'text-green-400 bg-green-400/10' },
  modified: { text: 'M', color: 'text-yellow-400 bg-yellow-400/10' },
  deleted: { text: 'D', color: 'text-red-400 bg-red-400/10' },
  renamed: { text: 'R', color: 'text-blue-400 bg-blue-400/10' },
  copied: { text: 'C', color: 'text-blue-400 bg-blue-400/10' },
};

export function getFileStatusBadge(status: FileStatus) {
  const badge = badges[status];
  return (
    <span className={cn('text-xs font-mono px-1.5 py-0.5 rounded', badge.color)}>
      {badge.text}
    </span>
  );
}
