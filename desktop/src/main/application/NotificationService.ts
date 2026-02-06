import { app, Notification, BrowserWindow } from 'electron'

export type NotificationType = 'completed' | 'failed' | 'question' | 'awaiting_input'

interface NotificationOptions {
  title: string
  body: string
  type: NotificationType
}

/**
 * Service for showing native OS notifications and dock alerts.
 * Helps users notice when autopilot needs attention even if they're in another app.
 */
class NotificationService {
  private lastNotificationTime: number = 0
  private readonly DEBOUNCE_MS = 2000 // Prevent notification spam

  /**
   * Show a native OS notification with dock bounce
   */
  show(options: NotificationOptions): void {
    // Debounce to prevent spam
    const now = Date.now()
    if (now - this.lastNotificationTime < this.DEBOUNCE_MS) {
      return
    }
    this.lastNotificationTime = now

    // Show native notification
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: options.title,
        body: options.body,
        silent: false,
      })

      notification.on('click', () => {
        // Focus the app window when notification is clicked
        const windows = BrowserWindow.getAllWindows()
        if (windows.length > 0) {
          const win = windows[0]
          if (win.isMinimized()) win.restore()
          win.focus()
        }
      })

      notification.show()
    }

    // Get user attention via platform-specific methods
    this.alertUser(options.type)
  }

  /**
   * Get user attention via platform-specific methods
   * - macOS: Bounce dock icon
   * - Windows: Flash taskbar
   * - Linux: Urgent hint on window
   */
  private alertUser(type: NotificationType): void {
    const windows = BrowserWindow.getAllWindows()
    if (windows.length === 0) return

    const win = windows[0]

    // Don't alert if user is already looking at the app
    if (win.isFocused()) return

    if (process.platform === 'darwin') {
      // macOS: Bounce dock icon
      if (app.dock) {
        const bounceType = type === 'failed' || type === 'question' ? 'critical' : 'informational'
        app.dock.bounce(bounceType)
      }
    } else if (process.platform === 'win32') {
      // Windows: Flash taskbar icon
      win.flashFrame(true)
      // Stop flashing after a few seconds for non-critical events
      if (type === 'completed') {
        setTimeout(() => win.flashFrame(false), 3000)
      }
    } else {
      // Linux: Set urgency hint
      win.flashFrame(true)
    }
  }

  /**
   * Convenience method for autopilot completion
   */
  notifyCompleted(agentName?: string): void {
    this.show({
      title: 'Autopilot Concluído',
      body: agentName
        ? `O agente ${agentName} finalizou a tarefa com sucesso.`
        : 'Todos os agentes finalizaram com sucesso.',
      type: 'completed',
    })
  }

  /**
   * Convenience method for autopilot failure
   */
  notifyFailed(error?: string): void {
    this.show({
      title: 'Autopilot Falhou',
      body: error || 'Ocorreu um erro durante a execução.',
      type: 'failed',
    })
  }

  /**
   * Convenience method for agent question
   */
  notifyQuestion(agentName: string): void {
    this.show({
      title: 'Agente Aguardando Resposta',
      body: `O agente ${agentName} tem uma pergunta e precisa da sua atenção.`,
      type: 'question',
    })
  }

  /**
   * Convenience method for awaiting input status
   */
  notifyAwaitingInput(agentName: string): void {
    this.show({
      title: 'Autopilot Pausado',
      body: `O agente ${agentName} terminou com pendências. Responda ou pule para continuar.`,
      type: 'awaiting_input',
    })
  }
}

// Singleton instance
export const notificationService = new NotificationService()
