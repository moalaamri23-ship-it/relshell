import { useState, useEffect, useRef, useMemo } from 'react'
import { TopBar } from './components/TopBar'
import { AppTile } from './components/AppTile'
import { SettingsPanel } from './components/SettingsPanel'
import { ManualViewer } from './components/ManualViewer'
import { Icon } from './components/Icon'
import { DEFAULT_APPS, STORAGE_KEY } from './constants'
import type { AppConfig } from './types'

const ANIM_CLASSES = [
  'animate-enter',
  'animate-enter-delay-1',
  'animate-enter-delay-2',
  'animate-enter-delay-3',
  'animate-enter-delay-4',
  'animate-enter-delay-5',
]

const loadApps = (): AppConfig[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const apps = JSON.parse(raw) as AppConfig[]
      // Migrate any cached http:// URLs → https:// (mixed-content fix for Cloudflare)
      const migrated = apps.map(a => ({
        ...a,
        url: a.url ? a.url.replace(/^http:\/\//i, 'https://') : a.url,
      }))
      return migrated
    }
  } catch { /* ignore */ }
  return DEFAULT_APPS
}

const saveApps = (apps: AppConfig[]) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(apps))

export default function App() {
  const [apps, setAppsState] = useState<AppConfig[]>(loadApps)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [activeApp, setActiveApp] = useState<AppConfig | null>(null)
  const [manualApp, setManualApp] = useState<AppConfig | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const setApps = (next: AppConfig[]) => {
    setAppsState(next)
    saveApps(next)
  }

  const handleLaunch = (app: AppConfig) => {
    if (app.url) setActiveApp(app)
  }

  const handleBack = () => setActiveApp(null)

  // Fullscreen the root wrapper div rather than document.documentElement — the
  // iframes are position:fixed inside it, so they still fill the screen.
  const toggleFullscreen = () => {
    shellWantsFullscreen.current = !document.fullscreenElement
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else rootRef.current?.requestFullscreen().catch(() => {})
  }

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // ── Fullscreen handoff with embedded apps ───────────────────────────────────
  // Chromium will not grant fullscreen to a cross-origin child while this
  // document already holds it: the child's requestFullscreen() never settles and
  // no fullscreenerror fires, so the app's own button appears dead. Worse, the
  // request cannot be revived afterwards — releasing our fullscreen later does
  // not complete it. The shell therefore has to step aside *before* the app asks.
  //
  //   app  → shell : { fs: 'request' }   sent from the click, before requesting
  //   shell→ app   : { fs: 'clear' }     after exiting its own fullscreen
  //   app  → shell : { fs: 'released' }  when the app leaves fullscreen
  //
  // The app keeps transient activation across that round-trip, so its request
  // still counts as user-initiated. On release we re-enter, which works only
  // when the app exited from a click (activation propagates to us); leaving via
  // Esc drops out of everything, which is what Esc does anyway.
  const shellWantsFullscreen = useRef(false)

  const appOrigins = useMemo(() => {
    const origins = new Set<string>()
    for (const app of apps) {
      if (!app.url) continue
      try { origins.add(new URL(app.url).origin) } catch { /* skip malformed */ }
    }
    return origins
  }, [apps])

  useEffect(() => {
    const onMessage = async (e: MessageEvent) => {
      const data = e.data as { fs?: string } | null
      if (!data || (data.fs !== 'request' && data.fs !== 'released')) return
      // Only apps we actually embed may drive the shell's fullscreen.
      if (!appOrigins.has(e.origin)) return

      if (data.fs === 'request') {
        if (document.fullscreenElement) {
          shellWantsFullscreen.current = true
          try { await document.exitFullscreen() } catch { /* already out */ }
        }
        ;(e.source as Window | null)?.postMessage({ fs: 'clear' }, e.origin)
        return
      }

      if (!shellWantsFullscreen.current || document.fullscreenElement) return
      shellWantsFullscreen.current = false
      // Needs the activation the app's own exit click propagated to us; after
      // Esc there is none and this rejects, leaving the shell windowed.
      try { await rootRef.current?.requestFullscreen() } catch { /* no activation */ }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [appOrigins])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Esc while fullscreen is consumed by the browser to leave fullscreen —
        // don't also unwind shell state on that same press.
        if (document.fullscreenElement) return
        if (manualApp) setManualApp(null)
        else setActiveApp(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [manualApp])

  return (
    <div ref={rootRef} className="h-screen overflow-hidden font-sans bg-slate-950">

      {/* ── Preloaded app iframes ─────────────────────────────────────────────
          All apps with URLs are mounted immediately and kept alive.
          visibility:hidden keeps them running in the background without
          consuming GPU compositing layers or blocking interaction.        */}
      {apps.filter(a => a.url).map(app => {
        const isActive = activeApp?.id === app.id
        return (
          <div
            key={`${app.id}::${app.url}`}
            className="fixed inset-0 z-50 bg-slate-950"
            style={{
              visibility: isActive ? 'visible' : 'hidden',
              pointerEvents: isActive ? 'auto' : 'none',
            }}
          >
            <iframe
              src={app.url}
              title={app.name}
              className="w-full h-full border-0"
              allow="fullscreen"
            />

            {/* Hover-reveal back arrow — only interactive when active */}
            {isActive && (
              <div className="fixed top-0 left-0 w-16 h-16 z-[60] group">
                <button
                  onClick={handleBack}
                  className="absolute top-3 left-3 w-7 h-7 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/75 text-white backdrop-blur-sm transition-opacity duration-200 opacity-0 group-hover:opacity-100"
                  title="Back to Reliability Shell (Esc)"
                >
                  <Icon name="arrowLeft" className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )
      })}

      {/* ── Shell UI ──────────────────────────────────────────────────────────
          Kept mounted so state (settings, scroll) is preserved.
          Hidden behind the active app via visibility when one is open.    */}
      <div
        className="h-full flex flex-col text-slate-700 bg-[#f8fafc]"
        style={{
          visibility: activeApp ? 'hidden' : 'visible',
          pointerEvents: activeApp ? 'none' : 'auto',
        }}
      >
        <TopBar
          onSettingsOpen={() => setSettingsOpen(true)}
          isFullscreen={isFullscreen}
          onFullscreenToggle={toggleFullscreen}
        />

        <main className="flex-1 flex flex-col items-center justify-center overflow-y-auto scroll-thin">
          <div className="mb-10 text-center animate-enter">
            <h1 className="text-3xl font-bold text-slate-900">Reliability Shell</h1>
            <p className="text-sm text-slate-400 mt-2">Select an application to launch</p>
          </div>

          {apps.length > 0 ? (
            <div className="flex flex-wrap gap-6 justify-center max-w-5xl px-8 pb-10">
              {apps.map((app, i) => (
                <AppTile
                  key={app.id}
                  app={app}
                  onClick={handleLaunch}
                  onManualOpen={setManualApp}
                  animClass={ANIM_CLASSES[Math.min(i, ANIM_CLASSES.length - 1)]}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 animate-enter">
              <div className="w-16 h-16 rounded bg-white border border-slate-200 shadow flex items-center justify-center">
                <svg className="w-7 h-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-slate-400 text-sm">No applications configured.</p>
              <button
                onClick={() => setSettingsOpen(true)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 rounded font-bold text-sm text-white transition"
              >
                Open Settings
              </button>
            </div>
          )}
        </main>

        {settingsOpen && (
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSettingsOpen(false)} />
        )}
        <SettingsPanel
          open={settingsOpen}
          apps={apps}
          onAppsChange={setApps}
          onClose={() => setSettingsOpen(false)}
        />
      </div>

      {manualApp && (
        <ManualViewer app={manualApp} onClose={() => setManualApp(null)} />
      )}
    </div>
  )
}
