import { useState } from 'react';
import { GitBranch, ChevronDown, Check, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Branch {
  name: string;
  current: boolean;
}

interface BranchSelectorProps {
  currentBranch: string;
  branches: Branch[];
  ahead?: number;
  behind?: number;
  onCheckout: (branch: string) => void;
  onCreateBranch: (name: string) => Promise<{ success: boolean }>;
}

export function BranchSelector({
  currentBranch,
  branches,
  ahead,
  behind,
  onCheckout,
  onCreateBranch,
}: BranchSelectorProps) {
  const [showBranches, setShowBranches] = useState(false);
  const [showNewBranch, setShowNewBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');

  const handleCheckout = (branch: string) => {
    onCheckout(branch);
    setShowBranches(false);
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;

    const result = await onCreateBranch(newBranchName);
    if (result.success) {
      setNewBranchName('');
      setShowNewBranch(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowBranches(!showBranches)}
        className="w-full flex items-center justify-between gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-purple-400" />
          <span className="text-white">{currentBranch}</span>
        </div>
        <div className="flex items-center gap-2">
          {ahead ? (
            <span className="text-xs text-green-400">{ahead}</span>
          ) : null}
          {behind ? (
            <span className="text-xs text-yellow-400">{behind}</span>
          ) : null}
          <ChevronDown className={cn('w-4 h-4 text-gray-500 transition-transform', showBranches && 'rotate-180')} />
        </div>
      </button>

      {showBranches && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#12121a] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
            {branches.map((branch) => (
              <button
                key={branch.name}
                onClick={() => handleCheckout(branch.name)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 transition-colors',
                  branch.current && 'bg-purple-500/10'
                )}
              >
                {branch.current && <Check className="w-4 h-4 text-purple-400" />}
                {!branch.current && <div className="w-4" />}
                <span className={branch.current ? 'text-purple-400' : 'text-gray-300'}>
                  {branch.name}
                </span>
              </button>
            ))}
          </div>

          <div className="border-t border-white/10 p-2">
            {showNewBranch ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateBranch()}
                  placeholder="New branch name"
                  className="flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  autoFocus
                />
                <button
                  onClick={handleCreateBranch}
                  className="p-1 text-green-400 hover:bg-white/10 rounded"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setShowNewBranch(false); setNewBranchName(''); }}
                  className="p-1 text-red-400 hover:bg-white/10 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowNewBranch(true)}
                className="w-full flex items-center gap-2 px-2 py-1 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create new branch
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
