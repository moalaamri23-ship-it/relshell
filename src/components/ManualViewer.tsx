import type { AppConfig } from '../types'
import { getManualUrl } from '../constants'
import { Icon } from './Icon'

interface ManualViewerProps {
  app: AppConfig
  onClose: () => void
}

export const ManualViewer = ({ app, onClose }: ManualViewerProps) => {
  const manualUrl = getManualUrl(app.url)

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 p-3 sm:p-6 animate-enter">
      <section className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden rounded bg-white shadow-2xl">
        <header className="h-14 shrink-0 bg-slate-900 px-4 sm:px-5 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
              <Icon name="book" className="w-4 h-4 text-brand-400" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm truncate">{app.name} User Manual</div>
              <div className="text-[10px] text-slate-400 font-mono truncate">{manualUrl}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ml-3 w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
            aria-label={`Close ${app.name} user manual`}
            title="Close manual (Esc)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <iframe
          src={manualUrl}
          title={`${app.name} User Manual`}
          className="w-full flex-1 border-0 bg-white"
        />
      </section>
    </div>
  )
}
