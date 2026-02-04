import { GitBranch } from 'lucide-react';

interface NoRepoViewProps {
  isLoading: boolean;
  onInit: () => void;
}

export function NoRepoView({ isLoading, onInit }: NoRepoViewProps) {
  return (
    <div className="h-full flex flex-col bg-[#0a0a0f]">
      <div className="p-4 border-b border-white/10">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <GitBranch className="w-4 h-4" />
          Source Control
        </h2>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <GitBranch className="w-8 h-8 text-gray-500" />
        </div>
        <p className="text-sm text-gray-400 mb-4">
          This folder is not a Git repository
        </p>
        <button
          onClick={onInit}
          disabled={isLoading}
          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
        >
          Initialize Repository
        </button>
      </div>
    </div>
  );
}
