import { useState } from 'react';
import { api, Requirement, RequirementsStatus } from '@/api';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Terminal,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
      {/* Modal - No backdrop click to close since this is blocking */}
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-[#12121a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="requirements-title"
      >
        {/* Header */}
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
                {platformNames[status.platform] || status.platform}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Warning message */}
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

          {/* Help text */}
          <div className="mt-6 p-4 bg-white/5 rounded-xl">
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
              <Terminal className="w-4 h-4" />
              <span className="font-medium">Installation Tips</span>
            </div>
            <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
              <li>Open a terminal and run the commands shown above</li>
              <li>You may need administrator/sudo privileges for some commands</li>
              <li>After installing, click "Check Again" to verify</li>
              {status.platform === 'darwin' && (
                <li>On macOS, you may be prompted to install Xcode Command Line Tools</li>
              )}
              {status.platform === 'win32' && (
                <li>On Windows, you may need to restart your terminal after installation</li>
              )}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-black/20 flex-shrink-0">
          <div className="text-sm text-gray-500">
            {missingRequired.length > 0 ? (
              <span className="text-red-400">
                {missingRequired.length} required {missingRequired.length === 1 ? 'dependency' : 'dependencies'} missing
              </span>
            ) : (
              <span className="text-green-400">All requirements met!</span>
            )}
          </div>
          <button
            onClick={status.allRequiredMet ? onRequirementsMet : handleRecheck}
            disabled={isRechecking}
            className={cn(
              'px-5 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2',
              status.allRequiredMet
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
            ) : status.allRequiredMet ? (
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
      </div>
    </div>
  );
}

function RequirementItem({
  requirement,
  isExpanded,
  onToggle,
  instructions,
  onCopy,
  isCopied,
}: {
  requirement: Requirement;
  isExpanded: boolean;
  onToggle: () => void;
  instructions: string;
  onCopy: () => void;
  isCopied: boolean;
}) {
  const isInstalled = requirement.status === 'installed';
  const isMissing = requirement.status === 'not_installed';

  return (
    <div
      className={cn(
        'rounded-xl border transition-colors',
        isInstalled
          ? 'bg-green-500/5 border-green-500/20'
          : isMissing && requirement.required
            ? 'bg-red-500/5 border-red-500/20'
            : 'bg-white/5 border-white/10'
      )}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left"
        disabled={isInstalled}
      >
        <div
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
            isInstalled
              ? 'bg-green-500/20 text-green-400'
              : isMissing && requirement.required
                ? 'bg-red-500/20 text-red-400'
                : 'bg-yellow-500/20 text-yellow-400'
          )}
        >
          {isInstalled ? (
            <CheckCircle className="w-4 h-4" />
          ) : isMissing ? (
            <XCircle className="w-4 h-4" />
          ) : (
            <Loader2 className="w-4 h-4 animate-spin" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">{requirement.name}</span>
            {requirement.required && (
              <span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">
                Required
              </span>
            )}
            {requirement.version && (
              <span className="text-xs text-gray-500">v{requirement.version}</span>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate">{requirement.description}</p>
        </div>

        {!isInstalled && (
          <div className="text-gray-500">
            <svg
              className={cn('w-4 h-4 transition-transform', isExpanded && 'rotate-180')}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && !isInstalled && (
        <div className="px-4 pb-4 pt-0">
          <div className="bg-black/30 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
              <span className="text-xs text-gray-500">Installation commands</span>
              <div className="flex items-center gap-2">
                {requirement.helpUrl && (
                  <a
                    href={requirement.helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.preventDefault();
                      api.openExternal(requirement.helpUrl!);
                    }}
                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Docs
                  </a>
                )}
                <button
                  onClick={onCopy}
                  className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3 h-3 text-green-400" />
                      <span className="text-green-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>
            <pre className="p-3 text-xs text-gray-300 overflow-x-auto font-mono whitespace-pre-wrap">
              {instructions}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
