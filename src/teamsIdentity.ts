import { IDENTITY_KEY } from './constants'

/**
 * Who is signed in, as Microsoft Teams reports it.
 *
 * Teams gives its context only to a page running as a custom Teams app (the shell
 * is one). In a browser or preview there is no Teams host, so this resolves null
 * and the shell keeps the email the engineer typed.
 *
 * Teams calls these values a hint, not proof: anyone can open the page outside
 * Teams and type another email. They fill a form and greet the user; never use
 * them to decide what someone may access.
 */
export interface Identity {
  email: string
  /** Address-book name exactly as Microsoft shows it ("Al Amri, Mohamed S"). Empty when unknown. */
  name: string
}

/** How long to wait for a Teams host before deciding there is none. */
const TEAMS_TIMEOUT_MS = 5000

const IN_FRAME = typeof window !== 'undefined' && window.self !== window.top

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Microsoft's name as given, only whitespace tidied. Never reordered. */
export const tidyName = (raw: string | null | undefined): string =>
  (raw ?? '').replace(/\s+/g, ' ').trim()

/** Last resort when no name is known: "first.last@x" → "First Last". */
export const nameFromEmail = (email: string): string => {
  const local = email.split('@')[0] ?? ''
  return local
    .split(/[._-]+/)
    .map(w => w.replace(/\d+/g, ''))
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

/** Ask Teams who the user is. Resolves null outside Teams. */
export const getTeamsIdentity = async (): Promise<Identity | null> => {
  if (!IN_FRAME) return null
  try {
    // Loaded only when framed, so the browser build does not pay for it.
    const { app } = await import('@microsoft/teams-js')
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('no Teams host')), TEAMS_TIMEOUT_MS))
    await Promise.race([app.initialize(), timeout])
    const ctx = await Promise.race([app.getContext(), timeout])
    const user = ctx.user
    const email = (user?.userPrincipalName || user?.loginHint || '').trim()
    if (!EMAIL_RE.test(email)) return null
    return { email, name: tidyName(user?.displayName) }
  } catch {
    return null
  }
}

/** How long to wait for the flow's profile lookup. Flow calls take 2–20 s. */
const PROFILE_TIMEOUT_MS = 30000

/**
 * The address-book name for an email, through the OXY Connection Flow
 * (router task `user_profile`, v1.5; SharePoint user profiles). Teams often
 * leaves the name out of its context, so this is where it usually comes from.
 * Resolves '' when the flow is not set, is older than v1.5, or knows no name.
 */
export const fetchProfileName = async (flowUrl: string, email: string): Promise<string> => {
  if (!/^https:\/\//i.test(flowUrl.trim()) || !EMAIL_RE.test(email)) return ''
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), PROFILE_TIMEOUT_MS)
  try {
    // text/plain keeps it a simple request: no CORS preflight (the router accepts both).
    const res = await fetch(flowUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ task: 'user_profile', email }),
      signal: ctrl.signal,
    })
    if (!res.ok) return ''
    const data = await res.json() as { displayName?: string | null }
    return tidyName(data.displayName)
  } catch {
    return ''
  } finally {
    clearTimeout(timer)
  }
}

/** The last identity Teams gave, so the greeting shows before Teams answers. */
export const loadIdentity = (): Identity | null => {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as Partial<Identity>
    if (typeof v.email !== 'string' || !EMAIL_RE.test(v.email)) return null
    return { email: v.email, name: typeof v.name === 'string' ? v.name : '' }
  } catch {
    return null
  }
}

export const saveIdentity = (id: Identity) => {
  try { localStorage.setItem(IDENTITY_KEY, JSON.stringify(id)) } catch { /* ignore */ }
}
