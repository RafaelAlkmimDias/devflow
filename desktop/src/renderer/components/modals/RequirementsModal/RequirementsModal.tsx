import { useState } from 'react';
import type { Requirement, RequirementsStatus } from '@shared/types';
import { AlertTriangle, CheckCircle, Loader2, RefreshCw, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { RequirementItem } from './RequirementItem';

interface RequirementsModalProps {
  isOpen: boolean;
  status: RequirementsStatus;
  onRequirementsMet: () => void;
  onRecheck: () => void;
}

const platformNames: Record<string, string> = {
  darwin: 'macOS',
  linux: 'Linux',
  win32: 'Windows',
};

export function RequirementsModal({
  isOpen,
  status,
  onRequirementsMet,
  onRecheck,
}: RequirementsModalProps) {
  const [isRechecking, setIsRechecking] = useState(false);
  const [expandedReq, setExpandedReq] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRecheck = async () => {
    setIsRechecking(true);
    try {
      onRecheck();
    } finally {
      setIsRechecking(false);
    }
  };

  const handleCopyInstructions = async (reqId: string, instructions: string) => {
    try {
      await navigator.clipboard.writeText(instructions);
      setCopiedId(reqId);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const getInstructions = (req: Requirement): string => {
    const platform = status.platform as 'darwin' | 'linux' | 'win32';
    return req.installInstructions[platform] || req.installInstructions.linux;
  };

  const missingRequired = status.requirements.filter(
    (r) => r.required && r.status !== 'installed'
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-[#12121a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="requirements-title"
      >
        {/* Header */}
        <ModalHeader platform={status.platform} />

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <WarningBanner />

          {/* Requirements list */}
          <div className="space-y-3">
            {status.requirements.map((req) => (
              <RequirementItem
                key={req.id}
                requirement={req}
                isExpanded={expandedReq === req.id}
                onToggle={() => setExpandedReq(expandedReq === req.id ? null : req.id)}
                instructions={getInstructions(req)}
                onCopy={() => handleCopyInstructions(req.id, getInstructions(req))}
                isCopied={copiedId === req.id}
              />
            ))}
          </div>

          <InstallationTips platform={status.platform} />
        </div>

        {/* Footer */}
        <ModalFooter
          missingCount={missingRequired.length}
          allMet={status.allRequiredMet}
          isRechecking={isRechecking}
          onAction={status.allRequiredMet ? onRequirementsMet : handleRecheck}
        />
      </div>
    </div>
  );
}

function ModalHeader({ platform }: { platform: string }) {
  return (
    <div className="px-6 pt-6 pb-4 border-b border-white/10 flex-shrink-0">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 id="requirements-title" className="text-lg font-semibold text-white">
            System Requirements
          </h2>
          <p className="text-sm text-gray-400">
            {platformNames[platform] || platform}
          </p>
        </div>
      </div>
    </div>
  );
}

function WarningBanner() {
  return (
    <div className="flex items-start gap-3 mb-5 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
      <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm text-red-200 font-medium">
          Missing required dependencies
        </p>
        <p className="text-xs text-red-200/70 mt-1">
          DevFlow requires the following software to be installed. Please install the missing
          dependencies and click "Check Again" to continue.
        </p>
      </div>
    </div>
  );
}

function InstallationTips({ platform }: { platform: string }) {
  return (
    <div className="mt-6 p-4 bg-white/5 rounded-xl">
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
        <Terminal className="w-4 h-4" />
        <span className="font-medium">Installation Tips</span>
      </div>
      <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
        <li>Open a terminal and run the commands shown above</li>
        <li>You may need administrator/sudo privileges for some commands</li>
        <li>After installing, click "Check Again" to verify</li>
        {platform === 'darwin' && (
          <li>On macOS, you may be prompted to install Xcode Command Line Tools</li>
        )}
        {platform === 'win32' && (
          <li>On Windows, you may need to restart your terminal after installation</li>
        )}
      </ul>
    </div>
  );
}

function ModalFooter({
  missingCount,
  allMet,
  isRechecking,
  onAction,
}: {
  missingCount: number;
  allMet: boolean;
  isRechecking: boolean;
  onAction: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-black/20 flex-shrink-0">
      <div className="text-sm text-gray-500">
        {missingCount > 0 ? (
          <span className="text-red-400">
            {missingCount} required {missingCount === 1 ? 'dependency' : 'dependencies'} missing
          </span>
        ) : (
          <span className="text-green-400">All requirements met!</span>
        )}
      </div>
      <button
        onClick={onAction}
        disabled={isRechecking}
        className={cn(
          'px-5 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2',
          allMet
            ? 'bg-green-600 hover:bg-green-500 text-white'
            : isRechecking
              ? 'bg-purple-600/50 text-purple-200 cursor-wait'
              : 'bg-purple-600 hover:bg-purple-500 text-white'
        )}
      >
        {isRechecking ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Checking...
          </>
        ) : allMet ? (
          <>
            <CheckCircle className="w-4 h-4" />
            Continue
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" />
            Check Again
          </>
        )}
      </button>
    </div>
  );
}
