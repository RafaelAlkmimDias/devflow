import { GitCommit, Upload, Download } from 'lucide-react';

interface CommitSectionProps {
  commitMessage: string;
  onCommitMessageChange: (message: string) => void;
  onCommit: () => void;
  onPush: () => void;
  onPull: () => void;
  canCommit: boolean;
  isLoading: boolean;
}

export function CommitSection({
  commitMessage,
  onCommitMessageChange,
  onCommit,
  onPush,
  onPull,
  canCommit,
  isLoading,
}: CommitSectionProps) {
  return (
    <div className="border-t border-white/10 p-3">
      <textarea
        value={commitMessage}
        onChange={(e) => onCommitMessageChange(e.target.value)}
        placeholder="Commit message"
        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
        rows={3}
      />

      <div className="flex gap-2 mt-2">
        <button
          onClick={onCommit}
          disabled={!canCommit || isLoading}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
        >
          <GitCommit className="w-4 h-4" />
          Commit
        </button>
      </div>

      <div className="flex gap-2 mt-2">
        <button
          onClick={onPull}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs rounded-lg transition-colors disabled:opacity-50"
        >
          <Download className="w-3 h-3" />
          Pull
        </button>
        <button
          onClick={onPush}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs rounded-lg transition-colors disabled:opacity-50"
        >
          <Upload className="w-3 h-3" />
          Push
        </button>
      </div>
    </div>
  );
}
