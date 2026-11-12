import { SHARED_SETTINGS_KEY } from './constants'

/**
 * Shared settings protocol between the shell and its built-in apps.
 *
 *   app   → shell : { cfg: 'request' }                       when the app loads
 *   shell → app   : { cfg: 'settings', aiRouterUrl?, engineerEmail? }
 *
 * The shell also pushes `settings` to every built-in frame when the engineer saves.
 * Only filled fields are sent; an app keeps its own value for anything left blank.
 * The flow URL is a signed secret, so the shell answers built-in app origins only,
 * never apps added by hand.
 */
export interface SharedSettings {
  aiRouterUrl: string
  engineerEmail: string
}

export const EMPTY_SHARED: SharedSettings = { aiRouterUrl: '', engineerEmail: '' }

export const loadShared = (): SharedSettings => {
  try {
    const raw = localStorage.getItem(SHARED_SETTINGS_KEY)
    if (raw) {
      const v = JSON.parse(raw) as Partial<SharedSettings>
      return {
        aiRouterUrl: typeof v.aiRouterUrl === 'string' ? v.aiRouterUrl : '',
        engineerEmail: typeof v.engineerEmail === 'string' ? v.engineerEmail : '',
      }
    }
  } catch { /* ignore */ }
  return EMPTY_SHARED
}

export const saveShared = (s: SharedSettings) => {
  try { localStorage.setItem(SHARED_SETTINGS_KEY, JSON.stringify(s)) } catch { /* ignore */ }
}

/** The message sent to an app; blank fields are left out. */
export const settingsMessage = (s: SharedSettings) => {
  const msg: { cfg: 'settings'; aiRouterUrl?: string; engineerEmail?: string } = { cfg: 'settings' }
  if (s.aiRouterUrl.trim()) msg.aiRouterUrl = s.aiRouterUrl.trim()
  if (s.engineerEmail.trim()) msg.engineerEmail = s.engineerEmail.trim()
  return msg
}

export const isValidFlowUrl = (url: string) => !url.trim() || /^https:\/\/\S+$/i.test(url.trim())
export const isValidEmail = (email: string) => !email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
