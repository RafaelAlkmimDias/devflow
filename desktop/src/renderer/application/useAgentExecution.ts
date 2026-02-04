import { useCallback, useState } from 'react'
import { agentApi } from '@/infrastructure/api'
import type { AutopilotStreamData } from '@shared/types'

/**
 * Hook for agent execution operations.
 * Provides methods for running agents and handling streaming output.
 */
export function useAgentExecution() {
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamData, setStreamData] = useState<AutopilotStreamData | null>(null)

  const execute = useCallback(async (agent: string, prompt: string, cwd: string): Promise<string> => {
    setIsStreaming(true)
    try {
      return await agentApi.execute(agent, prompt, cwd)
    } finally {
      setIsStreaming(false)
    }
  }, [])

  const respond = useCallback(async (agent: string, response: string): Promise<void> => {
    return agentApi.respond(agent, response)
  }, [])

  const cancel = useCallback(async (agent: string): Promise<void> => {
    return agentApi.cancel(agent)
  }, [])

  const subscribeToStream = useCallback((callback: (data: AutopilotStreamData) => void) => {
    return agentApi.onStream((data) => {
      setStreamData(data)
      callback(data)
    })
  }, [])

  return {
    execute,
    respond,
    cancel,
    subscribeToStream,
    isStreaming,
    streamData,
  }
}
