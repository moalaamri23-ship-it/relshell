import type { AppConfig } from '../types'
import {
  getManualHtmlDownloadUrl,
  getManualPdfUrl,
  getManualUrl,
} from '../constants'
import { Icon } from './Icon'

interface ManualViewerProps {
  app: AppConfig
  onClose: () => void
}

export const ManualViewer = ({ app, onClose }: ManualViewerProps) => {
  const manualUrl = getManualUrl(app.url)
  const htmlDownloadUrl = getManualHtmlDownloadUrl(app.url)
  const pdfDownloadUrl = getManualPdfUrl(app.url)

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
            </div>
          </div>

          <div className="ml-3 flex items-center gap-2 shrink-0">
            <details className="relative group">
              <summary
                aria-label="Download manual"
                className="list-none cursor-pointer h-8 px-3 flex items-center gap-2 rounded bg-slate-800 border border-slate-600 text-xs font-bold text-white hover:bg-slate-700 transition [&::-webkit-details-marker]:hidden"
              >
                <Icon name="download" className="w-3.5 h-3.5 text-brand-400" />
                <span className="hidden sm:inline">Download</span>
                <Icon name="chevronDown" className="w-3 h-3 text-slate-400 group-open:rotate-180 transition-transform" />
              </summary>

              <div className="absolute right-0 top-10 z-10 w-48 overflow-hidden rounded border border-slate-200 bg-white py-1 text-slate-700 shadow-xl animate-enter">
                <a
                  href={htmlDownloadUrl}
                  download={`${app.id}-manual.html`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2.5 text-xs font-bold hover:bg-slate-50 transition"
                >
                  <Icon name="code" className="w-4 h-4 text-brand-600" />
                  Download HTML
                </a>
                <a
                  href={pdfDownloadUrl}
                  download={`${app.id}-manual.pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 border-t border-slate-100 px-3 py-2.5 text-xs font-bold hover:bg-slate-50 transition"
                >
                  <Icon name="download" className="w-4 h-4 text-red-500" />
                  Download PDF
                </a>
              </div>
            </details>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label={`Close ${app.name} user manual`}
              title="Close manual (Esc)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
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
