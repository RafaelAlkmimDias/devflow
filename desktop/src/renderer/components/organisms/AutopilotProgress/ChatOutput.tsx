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
      <div className="text-xs text-gray-500 italic p-4">
        No output yet...
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-3 p-3 overflow-y-auto',
        shouldFillSpace ? 'flex-1 min-h-0' : (isMaximized ? 'max-h-[400px]' : 'max-h-60')
      )}
    >
      {messages.map((message, index) => (
        <div
          key={index}
          className={cn(
            'flex gap-2',
            message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
          )}
        >
          {/* Avatar */}
          <div
            className={cn(
              'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs',
              message.type === 'user'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-purple-500/20 text-purple-400'
            )}
          >
            {message.type === 'user' ? (
              <User className="w-4 h-4" />
            ) : (
              <span>{agent.icon}</span>
            )}
          </div>

          {/* Message bubble */}
          <div
            className={cn(
              'flex-1 max-w-[85%] rounded-lg px-3 py-2',
              message.type === 'user'
                ? 'bg-blue-500/10 border border-blue-500/20 ml-auto'
                : 'bg-white/5 border border-white/10'
            )}
          >
            {/* Header */}
            <div className={cn(
              'text-[10px] font-medium mb-1',
              message.type === 'user' ? 'text-blue-400 text-right' : agent.color
            )}>
              {message.type === 'user' ? 'Você' : `@${agentId}`}
            </div>

            {/* Content */}
            <pre className="text-xs text-gray-300 whitespace-pre-wrap break-words font-sans leading-relaxed">
              {message.content}
            </pre>
          </div>
        </div>
      ))}
    </div>
  );
}
