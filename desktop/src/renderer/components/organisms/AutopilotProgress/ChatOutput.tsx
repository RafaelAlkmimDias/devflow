import { useMemo } from 'react';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AGENT_INFO } from './types';
import type { AgentId } from '@/domain/types';

interface ChatMessage {
  type: 'agent' | 'user';
  content: string;
}

interface ChatOutputProps {
  output: string;
  agentId: AgentId;
  isMaximized?: boolean;
  shouldFillSpace?: boolean;
}

/**
 * Parse the output string into chat messages
 * User responses are marked with: ---\n[Sua resposta: ...]\n---
 */
function parseOutputToMessages(output: string): ChatMessage[] {
  if (!output) return [];

  const messages: ChatMessage[] = [];

  // Split by user response pattern
  const userResponsePattern = /\n*---\n\[Sua resposta: ([\s\S]*?)\]\n---\n*/g;

  let lastIndex = 0;
  let match;

  while ((match = userResponsePattern.exec(output)) !== null) {
    // Add agent message before this user response
    const agentContent = output.slice(lastIndex, match.index).trim();
    if (agentContent) {
      messages.push({ type: 'agent', content: agentContent });
    }

    // Add user response
    const userContent = match[1].trim();
    if (userContent) {
      messages.push({ type: 'user', content: userContent });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining agent content
  const remainingContent = output.slice(lastIndex).trim();
  if (remainingContent) {
    messages.push({ type: 'agent', content: remainingContent });
  }

  return messages;
}

export function ChatOutput({ output, agentId, isMaximized, shouldFillSpace }: ChatOutputProps) {
  const messages = useMemo(() => parseOutputToMessages(output), [output]);
  const agent = AGENT_INFO[agentId];

  if (messages.length === 0) {
    return (
      <div className="text-xs text-gray-500 italic p-4 text-center">
        No output yet...
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-4 p-3 overflow-y-auto',
        shouldFillSpace ? 'flex-1 min-h-0' : (isMaximized ? 'max-h-[400px]' : 'max-h-60')
      )}
    >
      {messages.map((message, index) => (
        <div
          key={index}
          className={cn(
            'flex gap-3 animate-fade-in',
            message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
          )}
        >
          {/* Avatar - Larger and more prominent */}
          <div
            className={cn(
              'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-lg',
              message.type === 'user'
                ? 'bg-gradient-to-br from-blue-500/30 to-blue-600/20 text-blue-300 ring-2 ring-blue-500/30'
                : 'bg-gradient-to-br from-purple-500/30 to-purple-600/20 text-purple-300 ring-2 ring-purple-500/30'
            )}
          >
            {message.type === 'user' ? (
              <User className="w-4 h-4" />
            ) : (
              <span className="text-base">{agent.icon}</span>
            )}
          </div>

          {/* Message bubble - Enhanced styling */}
          <div
            className={cn(
              'flex-1 max-w-[85%] rounded-xl px-4 py-3 shadow-md',
              message.type === 'user'
                ? 'chat-bubble-user ml-auto'
                : 'chat-bubble-agent'
            )}
          >
            {/* Header with better visual separation */}
            <div className={cn(
              'text-[11px] font-semibold mb-2 flex items-center gap-2',
              message.type === 'user' ? 'text-blue-300 justify-end' : agent.color
            )}>
              {message.type === 'user' ? (
                <>
                  <span>Você</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                </>
              ) : (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span>@{agentId}</span>
                </>
              )}
            </div>

            {/* Content with better typography */}
            <pre className={cn(
              'text-[13px] whitespace-pre-wrap break-words font-sans leading-relaxed',
              message.type === 'user' ? 'text-blue-100' : 'text-gray-200'
            )}>
              {message.content}
            </pre>
          </div>
        </div>
      ))}
    </div>
  );
}
