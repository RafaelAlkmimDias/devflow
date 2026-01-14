import { useState } from 'react';
import { api, DevFlowStatus } from '@/api';
import { Zap, FolderTree, Bot, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DevFlowSetupModalProps {
  isOpen: boolean;
  projectPath: string;
  status: DevFlowStatus;
  onClose: () => void;
  onSetupComplete: () => void;
}

export function DevFlowSetupModal({
  isOpen,
  projectPath,
  status,
  onClose,
  onSetupComplete,
}: DevFlowSetupModalProps) {
  const [isSettingUp, setIsSettingUp] = useState(false);

  if (!isOpen) return null;

  const projectName = projectPath.split('/').pop() || 'Project';

  const handleSetup = async () => {
    setIsSettingUp(true);
    try {
      const result = await api.setupDevFlow(projectPath);
      if (result.success) {
        toast.success('DevFlow setup complete!', {
          description: 'All agents and configuration files have been installed.',
        });
        onSetupComplete();
      } else {
        toast.error('Setup failed', {
          description: result.error || 'An unknown error occurred.',
        });
      }
    } catch (error) {
      toast.error('Setup failed', {
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
      });
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleSkip}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg bg-[#12121a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="devflow-setup-title"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 id="devflow-setup-title" className="text-lg font-semibold text-white">
                Setup DevFlow
              </h2>
              <p className="text-sm text-gray-400">for {projectName}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          <div className="flex items-start gap-3 mb-5 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-200">
                This project is not configured for DevFlow agents.
              </p>
              <p className="text-xs text-yellow-200/70 mt-1">
                Would you like to set up DevFlow to enable AI-assisted development with specialized agents?
              </p>
            </div>
          </div>

          {/* Status Items */}
          <div className="space-y-3 mb-5">
            <StatusItem
              icon={<Bot className="w-4 h-4" />}
              label="Agent Definitions"
              description="5 specialized AI agents"
              isPresent={status.hasAgents}
            />
            <StatusItem
              icon={<FolderTree className="w-4 h-4" />}
              label="DevFlow Configuration"
              description="Project memory & settings"
              isPresent={status.hasDevflowFolder && status.missingFiles.filter((f: string) => f.startsWith('.devflow')).length === 0}
            />
          </div>

          {/* What will be installed */}
          <div className="mb-5">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              What will be installed:
            </h3>
            <div className="text-sm text-gray-400 space-y-1">
              <p>
                <span className="text-purple-400">@strategist</span> - Planning & Requirements
              </p>
              <p>
                <span className="text-purple-400">@architect</span> - Design & Architecture
              </p>
              <p>
                <span className="text-purple-400">@builder</span> - Implementation
              </p>
              <p>
                <span className="text-purple-400">@guardian</span> - Quality & Security
              </p>
              <p>
                <span className="text-purple-400">@chronicler</span> - Documentation
              </p>
            </div>
          </div>

          {/* Missing files count */}
          {status.missingFiles.length > 0 && (
            <p className="text-xs text-gray-500 mb-4">
              {status.missingFiles.length} files will be created
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 bg-black/20">
          <button
            onClick={handleSkip}
            disabled={isSettingUp}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            Skip for now
          </button>
          <button
            onClick={handleSetup}
            disabled={isSettingUp}
            className={cn(
              'px-5 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2',
              isSettingUp
                ? 'bg-purple-600/50 text-purple-200 cursor-wait'
                : 'bg-purple-600 hover:bg-purple-500 text-white'
            )}
          >
            {isSettingUp ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Setup DevFlow
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusItem({
  icon,
  label,
  description,
  isPresent,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  isPresent: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center',
        isPresent ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
      )}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm text-white">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      {isPresent ? (
        <CheckCircle className="w-5 h-5 text-green-400" />
      ) : (
        <XCircle className="w-5 h-5 text-red-400" />
      )}
    </div>
  );
}
