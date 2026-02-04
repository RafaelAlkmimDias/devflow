import { CheckCircle, XCircle, Loader2, ExternalLink, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { appApi } from '@/infrastructure/api';
import type { Requirement } from '@shared/types';

interface RequirementItemProps {
  requirement: Requirement;
  isExpanded: boolean;
  onToggle: () => void;
  instructions: string;
  onCopy: () => void;
  isCopied: boolean;
}

export function RequirementItem({
  requirement,
  isExpanded,
  onToggle,
  instructions,
  onCopy,
  isCopied,
}: RequirementItemProps) {
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
        <StatusIcon isInstalled={isInstalled} isMissing={isMissing} isRequired={requirement.required} />

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
        <InstallationInstructions
          instructions={instructions}
          helpUrl={requirement.helpUrl}
          onCopy={onCopy}
          isCopied={isCopied}
        />
      )}
    </div>
  );
}

function StatusIcon({
  isInstalled,
  isMissing,
  isRequired,
}: {
  isInstalled: boolean;
  isMissing: boolean;
  isRequired: boolean;
}) {
  return (
    <div
      className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
        isInstalled
          ? 'bg-green-500/20 text-green-400'
          : isMissing && isRequired
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
  );
}

function InstallationInstructions({
  instructions,
  helpUrl,
  onCopy,
  isCopied,
}: {
  instructions: string;
  helpUrl?: string;
  onCopy: () => void;
  isCopied: boolean;
}) {
  return (
    <div className="px-4 pb-4 pt-0">
      <div className="bg-black/30 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
          <span className="text-xs text-gray-500">Installation commands</span>
          <div className="flex items-center gap-2">
            {helpUrl && (
              <a
                href={helpUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.preventDefault();
                  appApi.openExternal(helpUrl);
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
  );
}
