import { useState, useEffect } from 'react'
import { TopBar } from './components/TopBar'
import { AppTile } from './components/AppTile'
import { SettingsPanel } from './components/SettingsPanel'
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
    if (raw) return JSON.parse(raw) as AppConfig[]
  } catch { /* ignore */ }
  return DEFAULT_APPS
}

const saveApps = (apps: AppConfig[]) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(apps))

export default function App() {
  const [apps, setAppsState] = useState<AppConfig[]>(loadApps)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [activeApp, setActiveApp] = useState<AppConfig | null>(null)

  const setApps = (next: AppConfig[]) => {
    setAppsState(next)
    saveApps(next)
  }

  const handleLaunch = (app: AppConfig) => {
    if (app.url) setActiveApp(app)
  }

  const handleBack = () => setActiveApp(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveApp(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="h-screen overflow-hidden font-sans">

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

            {/* Fallback — shown when iframe is blocked by X-Frame-Options / CSP */}
            {isActive && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-white rounded-xl shadow-xl p-8 max-w-sm text-center pointer-events-auto"
                     style={{ opacity: 0, animation: 'fadeIn 0.3s 4s ease-out forwards' }}>
                  <div className="text-slate-400 text-sm mb-1">Unable to embed this app</div>
                  <div className="text-xs text-slate-400 mb-4">
                    The app may be blocking iframe embedding.<br />
                    Add a <code className="bg-slate-100 px-1 rounded font-mono">_headers</code> file to allow it.
                  </div>
                  <a
                    href={app.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded font-bold text-sm hover:bg-slate-800 transition"
                  >
                    Open in new tab
                    <Icon name="arrowLeft" className="w-4 h-4 rotate-180" />
                  </a>
                </div>
              </div>
            )}

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
        <TopBar onSettingsOpen={() => setSettingsOpen(true)} />

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
    </div>
  )
}
