import { useState, useEffect } from 'react'
import { Icon } from './Icon'
import type { AppConfig } from '../types'

interface TopBarProps {
  onSettingsOpen: () => void
  activeApp?: AppConfig | null
  onBack?: () => void
}

export const TopBar = ({ onSettingsOpen, activeApp, onBack }: TopBarProps) => {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between px-6 z-20 shrink-0">
      {/* Left side: back button when app active, logo otherwise */}
      {activeApp ? (
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition"
            title="Back to Shell"
          >
            <Icon name="arrowLeft" className="w-4 h-4" />
            <span className="text-sm font-medium">Shell</span>
          </button>
          <div className="w-px h-5 bg-slate-800" />
          <span className="text-sm font-bold text-white">{activeApp.name}</span>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0">
            <img src="icon-512.png" className="w-full h-full object-cover object-center" alt="Reliability Shell" />
          </div>
          <div>
            <div className="font-bold text-white text-sm tracking-tight leading-none">Reliability Shell</div>
            <div className="text-[10px] text-slate-600 font-medium uppercase tracking-widest mt-0.5">
              Engineering Platform
            </div>
          </div>
        </div>
      )}

      {/* DateTime + gear */}
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block select-none">
          <div className="text-xs font-mono text-slate-400 tabular-nums leading-none">
            {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="text-[10px] text-slate-600 mt-0.5">
            {now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>

        <div className="w-px h-5 bg-slate-800 hidden sm:block" />

        {!activeApp && (
          <button
            onClick={onSettingsOpen}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition"
            title="Settings"
          >
            <Icon name="gear" className="w-[18px] h-[18px]" />
          </button>
        )}
      </div>
    </header>
  )
}
