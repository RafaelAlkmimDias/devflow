import { ipcMain } from 'electron'
import { notificationService, NotificationType } from '../application/NotificationService'

/**
 * Register IPC handlers for native notifications.
 */
export function registerNotificationHandlers(): void {
  // Generic notification
  ipcMain.handle(
    'notification:show',
    async (_, title: string, body: string, type: NotificationType): Promise<void> => {
      notificationService.show({ title, body, type })
    }
  )

  // Autopilot completed
  ipcMain.handle(
    'notification:completed',
    async (_, agentName?: string): Promise<void> => {
      notificationService.notifyCompleted(agentName)
    }
  )

  // Autopilot failed
  ipcMain.handle(
    'notification:failed',
    async (_, error?: string): Promise<void> => {
      notificationService.notifyFailed(error)
    }
  )

  // Agent has question
  ipcMain.handle(
    'notification:question',
    async (_, agentName: string): Promise<void> => {
      notificationService.notifyQuestion(agentName)
    }
  )

  // Awaiting input
  ipcMain.handle(
    'notification:awaitingInput',
    async (_, agentName: string): Promise<void> => {
      notificationService.notifyAwaitingInput(agentName)
    }
  )
}
