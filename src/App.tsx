import { useState } from 'react'
import { TopBar } from './components/TopBar'
import { AppTile } from './components/AppTile'
import { SettingsPanel } from './components/SettingsPanel'
import { DEFAULT_APPS, STORAGE_KEY } from './constants'
import type { AppConfig } from './types'

// ─── Staggered animation classes for the grid tiles ──────────────────────────

const ANIM_CLASSES = [
  'animate-enter',
  'animate-enter-delay-1',
  'animate-enter-delay-2',
  'animate-enter-delay-3',
  'animate-enter-delay-4',
  'animate-enter-delay-5',
]

// ─── localStorage helpers ─────────────────────────────────────────────────────

const loadApps = (): AppConfig[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as AppConfig[]
  } catch { /* ignore */ }
  return DEFAULT_APPS
}

const saveApps = (apps: AppConfig[]) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(apps))

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [apps, setAppsState] = useState<AppConfig[]>(loadApps)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const setApps = (next: AppConfig[]) => {
    setAppsState(next)
    saveApps(next)
  }

  const handleLaunch = (app: AppConfig) => {
    if (app.url) window.open(app.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="h-screen flex flex-col font-sans text-slate-700 bg-[#f8fafc] overflow-hidden">
      <TopBar onSettingsOpen={() => setSettingsOpen(true)} />

      {/* Main content — centered grid, fills remaining height */}
      <main className="flex-1 flex flex-col items-center justify-center overflow-y-auto scroll-thin">
        {/* Welcome header */}
        <div className="mb-10 text-center animate-enter">
          <h1 className="text-3xl font-bold text-slate-900">Reliability Shell</h1>
          <p className="text-sm text-slate-400 mt-2">Select an application to launch</p>
        </div>

        {/* App grid */}
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

      {/* Settings backdrop */}
      {settingsOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setSettingsOpen(false)}
        />
      )}

      <SettingsPanel
        open={settingsOpen}
        apps={apps}
        onAppsChange={setApps}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  )
}
