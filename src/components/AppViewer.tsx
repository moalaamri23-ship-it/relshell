import type { AppConfig } from '../types'
import { Icon } from './Icon'

interface AppViewerProps {
  app: AppConfig
  onBack: () => void
}

export const AppViewer = ({ app, onBack }: AppViewerProps) => (
  <div className="fixed inset-0 z-50 bg-slate-950">
    {/* Full-screen iframe — no TopBar offset */}
    <iframe
      src={app.url}
      title={app.name}
      className="w-full h-full border-0"
      allow="fullscreen"
    />

    {/* Invisible hover zone — back arrow appears when cursor enters top-left corner */}
    <div className="fixed top-0 left-0 w-16 h-16 z-[60] group">
      <button
        onClick={onBack}
        className="absolute top-3 left-3 w-7 h-7 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/75 text-white backdrop-blur-sm transition-opacity duration-200 opacity-0 group-hover:opacity-100"
        title="Back to Reliability Shell (Esc)"
      >
        <Icon name="arrowLeft" className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
)
