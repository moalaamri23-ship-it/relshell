import { Component, type ReactNode } from 'react'

/**
 * The shell's last line of defence: a render error anywhere below shows this
 * screen with a Retry button instead of unmounting everything to a blank page.
 *
 * Inline styles, not Tailwind: the screen has to read even when the Tailwind CDN
 * is what failed to load.
 */
export class StartupErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error('[RelShell] render failed', error)
  }

  render() {
    if (!this.state.error) return this.props.children
    return <StartupError detail={this.state.error.message} />
  }
}

export const StartupError = ({ detail }: { detail?: string }) => (
  <div
    role="alert"
    style={{
      minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24,
      background: '#020617', color: '#cbd5e1', fontFamily: 'Inter, system-ui, sans-serif',
    }}
  >
    <div style={{ maxWidth: 420, textAlign: 'center' }}>
      <div style={{ fontWeight: 700, fontSize: 16, color: '#f8fafc' }}>Reliability Shell could not start</div>
      <p style={{ fontSize: 13, color: '#94a3b8', margin: '8px 0 16px' }}>
        Something went wrong while loading. Retry usually fixes it; if it keeps happening,
        open the shell in Edge and send the message below to the app owner.
      </p>
      {detail && (
        <pre style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: '#94a3b8', background: '#0f172a',
          border: '1px solid #1e293b', borderRadius: 4, padding: 8, whiteSpace: 'pre-wrap',
          wordBreak: 'break-word', textAlign: 'left', margin: '0 0 16px',
        }}>{detail}</pre>
      )}
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          background: '#2563eb', color: '#fff', border: 0, borderRadius: 4, padding: '8px 16px',
          fontWeight: 700, fontSize: 13, cursor: 'pointer',
        }}
      >
        Retry
      </button>
    </div>
  </div>
)
