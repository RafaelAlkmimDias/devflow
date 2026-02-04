import { AgentIcon } from '@/components/agents/AgentIcons';
import { AGENT_ACTIONS, QUICK_COMMANDS } from './types';

interface TerminalQuickActionsProps {
  onWriteCommand: (command: string) => void;
}

export function TerminalQuickActions({ onWriteCommand }: TerminalQuickActionsProps) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 bg-[#12121a] border-t border-white/10 flex-shrink-0 overflow-x-auto">
      <div className="flex items-center gap-1">
        {QUICK_COMMANDS.map((cmd) => (
          <button
            key={cmd.label}
            onClick={() => onWriteCommand(cmd.command)}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
            title={cmd.command}
          >
            <cmd.icon className="w-3 h-3" />
            {cmd.label}
          </button>
        ))}
      </div>

      <div className="w-px h-4 bg-white/10" />

      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500 mr-1">Agents:</span>
        {AGENT_ACTIONS.map((agent) => (
          <button
            key={agent.id}
            onClick={() => onWriteCommand(agent.command)}
            className="flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors hover:bg-white/10"
            style={{ color: agent.color }}
            title={agent.command}
          >
            <AgentIcon agentId={agent.id} size={12} />
            {agent.label}
          </button>
        ))}
      </div>
    </div>
  );
}
