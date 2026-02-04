import { File, FileText, FileCode, FileJson } from 'lucide-react';

export function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'md':
      return <FileText className="w-4 h-4 text-blue-400" />;
    case 'json':
    case 'yaml':
    case 'yml':
      return <FileJson className="w-4 h-4 text-yellow-400" />;
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
      return <FileCode className="w-4 h-4 text-green-400" />;
    default:
      return <File className="w-4 h-4 text-gray-400" />;
  }
}
