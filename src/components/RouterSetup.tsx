import { useEffect, useState } from 'react'
import { Icon } from './Icon'
import { ROUTER_ZIP_URL, personalizeRouterZip, readRouterVersion } from '../routerSetup'

/**
 * Settings → Router Set-up (Teams only). Downloads the engineer's own copy of the
 * OXY Connection Flow solution, built for their Teams email, with the steps to
 * import it. The same button brings each new release: the copy keeps its IDs, so
 * importing it upgrades their flows.
 */
export const RouterSetup = ({ email, name, open }: { email: string; name?: string; open: boolean }) => {
  const [version, setVersion] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  useEffect(() => {
    if (!open || version) return
    let cancelled = false
    fetch(ROUTER_ZIP_URL, { cache: 'no-cache' })
      .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(readRouterVersion)
      .then(v => { if (!cancelled) setVersion(v) })
      .catch(() => { /* shown as unknown; download reports its own error */ })
    return () => { cancelled = true }
  }, [open, version])

  const download = async () => {
    setBusy(true); setError(''); setDone('')
    try {
      const res = await fetch(ROUTER_ZIP_URL, { cache: 'no-cache' })
      if (!res.ok) throw new Error(`The router package could not be fetched (HTTP ${res.status}).`)
      const copy = await personalizeRouterZip(await res.arrayBuffer(), email)
      setVersion(copy.version)
      const url = URL.createObjectURL(copy.blob)
      const a = document.createElement('a')
      a.href = url
      a.download = copy.fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
      setDone(copy.fileName)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="bg-white border border-slate-200 rounded shadow-sm p-4 mb-4 space-y-3">
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-bold text-slate-900">Router Set-up</div>
          {version && <span className="text-[10px] font-bold font-mono text-slate-400">v{version}</span>}
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          Your own copy of the OXY Connection Flow, made for <span className="font-semibold text-slate-500">{name || email}</span>.
          It runs on your connections and never touches anyone else's flows.
        </p>
      </div>

      <ol className="list-decimal ml-5 space-y-1 text-xs text-slate-600">
        <li>Download your copy below.</li>
        <li>Power Automate → <b>Solutions</b> → <b>Import solution</b> → choose the file.</li>
        <li>Pick or create each connection, and fill the gateway URL if asked.</li>
        <li>Turn the flows on: every <b>OXY - …</b> flow, then <b>AI Router - chat</b>, then <b>AI Router</b>.</li>
        <li>In each <b>OXY - …</b> flow: <b>Run only users</b> → every connection “Use this connection”.</li>
        <li>First time only: copy the <b>AI Router</b> HTTP URL into <b>OXY Connection Flow URL</b> above and Save.</li>
      </ol>
      <p className="text-xs text-slate-400">
        New version here? Download again and import it: it upgrades your copy (then turn the flows on again).
      </p>

      {error && <p className="text-xs text-red-500">{error}</p>}
      {done && !error && <p className="text-xs text-emerald-600 font-semibold">Downloaded {done}</p>}

      <div className="flex justify-end">
        <button
          onClick={download}
          disabled={busy}
          className="px-4 py-2 bg-slate-900 text-white rounded font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition flex items-center gap-2"
        >
          <Icon name="download" className="w-4 h-4" />
          {busy ? 'Preparing…' : 'Download my router'}
        </button>
      </div>
    </section>
  )
}
