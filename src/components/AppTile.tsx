import { useState, useEffect } from 'react'
import type { AppConfig, AccentColor } from '../types'
import { ACCENT_META, FAVICON_PREFIX, getIconCandidates } from '../constants'

// ─── Letter avatar fallback ───────────────────────────────────────────────────

const LetterAvatar = ({ name, accent }: { name: string; accent: AccentColor }) => {
  const meta = ACCENT_META[accent]
  return (
    <div className={`w-[72px] h-[72px] rounded-xl flex items-center justify-center text-3xl font-bold ${meta.letterBg} ${meta.letterText}`}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

// ─── Icon loader ──────────────────────────────────────────────────────────────
// Imperatively tries each candidate URL via new Image(). Avoids React
// state-chaining issues with onError across multiple re-renders.

const AppIcon = ({ url, appName, accent }: { url: string; appName: string; accent: AccentColor }) => {
  // Initial value: whatever we last cached for this URL
  const [iconSrc, setIconSrc] = useState<string | null>(() =>
    url ? localStorage.getItem(FAVICON_PREFIX + url) : null
  )

  useEffect(() => {
    if (!url) return

    const candidates = getIconCandidates(url)
    let cancelled = false

    const tryLoad = (idx: number) => {
      if (cancelled || idx >= candidates.length) return

      const img = new Image()

      img.onload = () => {
        if (cancelled) return
        localStorage.setItem(FAVICON_PREFIX + url, candidates[idx])
        setIconSrc(candidates[idx])
      }

      img.onerror = () => {
        if (!cancelled) tryLoad(idx + 1)
      }

      img.src = candidates[idx]
    }

    tryLoad(0)

    return () => { cancelled = true }
  }, [url])

  if (!iconSrc) return <LetterAvatar name={appName} accent={accent} />

  return (
    <div className="w-[72px] h-[72px] rounded-xl overflow-hidden shrink-0">
      <img
        src={iconSrc}
        className="w-full h-full object-cover object-center"
        onError={() => {
          if (url) localStorage.removeItem(FAVICON_PREFIX + url)
          setIconSrc(null)
        }}
        alt={appName}
      />
    </div>
  )
}

// ─── Background re-fetch on launch ───────────────────────────────────────────
// Re-probes all candidates so localStorage stays up to date for next visit.

const refetchIcon = (url: string) => {
  const candidates = getIconCandidates(url)

  const tryNext = (idx: number) => {
    if (idx >= candidates.length) return
    const img = new Image()
    img.onload = () => localStorage.setItem(FAVICON_PREFIX + url, candidates[idx])
    img.onerror = () => tryNext(idx + 1)
    img.src = candidates[idx]
  }

  tryNext(0)
}

// ─── Tile ─────────────────────────────────────────────────────────────────────

interface AppTileProps {
  app: AppConfig
  onClick: (app: AppConfig) => void
  animClass?: string
}

export const AppTile = ({ app, onClick, animClass = 'animate-enter' }: AppTileProps) => {
  const meta = ACCENT_META[app.accent]

  const handleClick = () => {
    if (app.url) refetchIcon(app.url)
    onClick(app)
  }

  return (
    <div
      onClick={handleClick}
      className={`group relative w-[200px] h-[200px] bg-white rounded shadow hover:shadow-lg cursor-pointer transition-all duration-200 hover:-translate-y-0.5 overflow-hidden ${animClass}`}
    >
      {/* Colored top accent bar */}
      <div className="h-[3px] w-full" style={{ backgroundColor: meta.bar }} />

      {/* Icon area */}
      <div className="flex items-center justify-center h-[112px]">
        <AppIcon url={app.url} appName={app.name} accent={app.accent} />
      </div>

      {/* Name + description */}
      <div className="px-4 pb-4">
        <div className="font-bold text-slate-900 text-sm leading-tight">{app.name}</div>
        <div className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">{app.description}</div>
      </div>
    </div>
  )
}
