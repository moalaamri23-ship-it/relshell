import { useState, useEffect } from 'react'
import type { AppConfig, AccentColor } from '../types'
import { ACCENT_META, ACCENT_COLORS, FAVICON_PREFIX, isBuiltinApp } from '../constants'
import { isValidEmail, isValidFlowUrl, type SharedSettings } from '../sharedSettings'
import { Icon } from './Icon'
import { storageRemove } from '../safeStorage'
import { RouterSetup } from './RouterSetup'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  name: string
  url: string
  description: string
  accent: AccentColor
}

const EMPTY_FORM: FormState = { name: '', url: '', description: '', accent: 'blue' }

interface SettingsPanelProps {
  open: boolean
  apps: AppConfig[]
  onAppsChange: (apps: AppConfig[]) => void
  shared: SharedSettings
  onSharedChange: (shared: SharedSettings) => void
  /** Inside Teams the email comes from the signed-in account and is not editable. */
  emailFromTeams?: boolean
  onClose: () => void
}

// ─── Settings panel ───────────────────────────────────────────────────────────

export const SettingsPanel = ({ open, apps, onAppsChange, shared, onSharedChange, emailFromTeams = false, onClose }: SettingsPanelProps) => {
  const [view, setView] = useState<'list' | 'form'>('list')
  const [editTarget, setEditTarget] = useState<AppConfig | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [sharedDraft, setSharedDraft] = useState<SharedSettings>(shared)
  const [sharedSaved, setSharedSaved] = useState(false)

  useEffect(() => {
    if (open) {
      setView('list')
      setDeleteConfirmId(null)
      setSharedDraft(shared)
      setSharedSaved(false)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const urlOk = isValidFlowUrl(sharedDraft.aiRouterUrl)
  const emailOk = isValidEmail(sharedDraft.engineerEmail)
  const sharedDirty =
    sharedDraft.aiRouterUrl.trim() !== shared.aiRouterUrl.trim() ||
    sharedDraft.engineerEmail.trim() !== shared.engineerEmail.trim()

  const saveShared = () => {
    if (!urlOk || !emailOk) return
    onSharedChange({
      aiRouterUrl: sharedDraft.aiRouterUrl.trim(),
      engineerEmail: sharedDraft.engineerEmail.trim(),
    })
    setSharedSaved(true)
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setView('form')
  }

  const openEdit = (app: AppConfig) => {
    setEditTarget(app)
    setForm({ name: app.name, url: app.url, description: app.description, accent: app.accent })
    setView('form')
  }

  const handleSave = () => {
    const name = form.name.trim()
    // A built-in app's URL is fixed by the shell; only hand-added apps take the form's.
    const url  = editTarget && isBuiltinApp(editTarget) ? editTarget.url : form.url.trim()
    const description = form.description.trim()
    if (!name) return

    if (editTarget) {
      if (editTarget.url !== url) storageRemove(FAVICON_PREFIX + editTarget.url)
      onAppsChange(
        apps.map(a => a.id === editTarget.id ? { ...a, name, url, description, accent: form.accent } : a)
      )
    } else {
      const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 7)
      onAppsChange([...apps, { id, name, url, description, accent: form.accent }])
    }
    setView('list')
  }

  const handleDelete = (id: string) => {
    const app = apps.find(a => a.id === id)
    if (!app || isBuiltinApp(app)) return
    if (app.url) storageRemove(FAVICON_PREFIX + app.url)
    onAppsChange(apps.filter(a => a.id !== id))
    setDeleteConfirmId(null)
  }

  const moveUp = (idx: number) => {
    if (idx === 0) return
    const arr = [...apps];
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
    onAppsChange(arr)
  }

  const moveDown = (idx: number) => {
    if (idx === apps.length - 1) return
    const arr = [...apps];
    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
    onAppsChange(arr)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <aside
      className={`fixed top-0 right-0 h-full w-[400px] max-w-[92vw] bg-white border-l border-slate-200 z-50 flex flex-col shadow-xl transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
    >
      {/* Dark header — matches the app-shell header style */}
      <div className="h-14 bg-slate-900 text-white flex items-center justify-between px-5 shrink-0">
        {view === 'list' ? (
          <>
            <div className="flex items-center gap-2">
              <Icon name="gear" className="w-4 h-4 text-slate-400" />
              <span className="font-bold text-sm">Settings</span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView('list')}
                className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <Icon name="arrowLeft" className="w-4 h-4" />
              </button>
              <span className="font-bold text-sm">
                {editTarget ? 'Edit Application' : 'Add Application'}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Content */}
      {view === 'list' ? (
        <>
          <div className="flex-1 overflow-y-auto scroll-thin px-4 py-4 space-y-2">
            {/* Shared settings — handed to every built-in app */}
            <section className="bg-white border border-slate-200 rounded shadow-sm p-4 mb-4 space-y-3">
              <div>
                <div className="text-sm font-bold text-slate-900">Shared settings</div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Filled into every built-in app when it opens here. Apps you add yourself do not receive them.
                </p>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 ml-1">
                  OXY Connection Flow URL
                </label>
                <input
                  type="password"
                  autoComplete="off"
                  value={sharedDraft.aiRouterUrl}
                  onChange={e => { setSharedDraft(d => ({ ...d, aiRouterUrl: e.target.value })); setSharedSaved(false) }}
                  placeholder="https://..."
                  className={`w-full bg-white border rounded p-2 text-sm font-mono outline-none transition shadow-sm ${urlOk ? 'border-slate-200 focus:border-brand-500' : 'border-red-400'}`}
                />
                {!urlOk && <p className="text-xs text-red-500 mt-1 ml-1">Enter an https:// URL.</p>}
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 ml-1">
                  Company email
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  value={sharedDraft.engineerEmail}
                  onChange={e => { setSharedDraft(d => ({ ...d, engineerEmail: e.target.value })); setSharedSaved(false) }}
                  readOnly={emailFromTeams}
                  placeholder="name@company.com"
                  className={`w-full border rounded p-2 text-sm outline-none transition shadow-sm ${emailFromTeams ? 'bg-slate-50 text-slate-500 cursor-default border-slate-200' : `bg-white ${emailOk ? 'border-slate-200 focus:border-brand-500' : 'border-red-400'}`}`}
                />
                {emailFromTeams && <p className="text-xs text-slate-400 mt-1 ml-1">From your Microsoft Teams account.</p>}
                {!emailFromTeams && !emailOk && <p className="text-xs text-red-500 mt-1 ml-1">Enter a valid email.</p>}
              </div>
              <div className="flex items-center justify-end gap-3">
                {sharedSaved && !sharedDirty && <span className="text-xs text-emerald-600 font-semibold">Saved</span>}
                <button
                  onClick={saveShared}
                  disabled={!sharedDirty || !urlOk || !emailOk}
                  className="px-4 py-2 bg-slate-900 text-white rounded font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition flex items-center gap-2"
                >
                  <Icon name="save" className="w-4 h-4" />
                  Save
                </button>
              </div>
            </section>

            {/* Teams only: the email that names the copy comes from the signed-in account. */}
            {emailFromTeams && isValidEmail(shared.engineerEmail) && shared.engineerEmail.trim() && (
              <RouterSetup email={shared.engineerEmail.trim()} open={open} />
            )}

            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1 pt-1">Applications</div>
            {apps.length === 0 && (
              <p className="text-center text-slate-400 text-sm py-10">No apps configured.</p>
            )}
            {apps.map((app, idx) => {
              const meta = ACCENT_META[app.accent]
              const builtin = isBuiltinApp(app)
              const isConfirming = !builtin && deleteConfirmId === app.id
              return (
                <div
                  key={app.id}
                  className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden"
                >
                  {isConfirming ? (
                    <div className="px-4 py-3 flex items-center justify-between gap-2 bg-red-50 border-l-4 border-red-400">
                      <span className="text-sm text-slate-600">
                        Delete <span className="font-semibold text-slate-900">{app.name}</span>?
                      </span>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-3 py-1 text-xs border border-slate-300 rounded text-slate-600 hover:bg-slate-50 transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDelete(app.id)}
                          className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-3 flex items-center gap-3 group hover:bg-slate-50 transition">
                      {/* Accent bar */}
                      <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: meta.bar }} />

                      {/* App info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate">{app.name}</div>
                        {builtin
                          ? <div className="text-xs text-slate-400 truncate">Built-in</div>
                          : <div className="text-xs text-slate-400 truncate font-mono">{app.url || 'No URL'}</div>}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => moveUp(idx)}
                          disabled={idx === 0}
                          className="w-7 h-7 flex items-center justify-center rounded text-slate-300 hover:text-slate-600 disabled:opacity-25 disabled:cursor-not-allowed transition"
                          title="Move up"
                        >
                          <Icon name="arrowUp" className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveDown(idx)}
                          disabled={idx === apps.length - 1}
                          className="w-7 h-7 flex items-center justify-center rounded text-slate-300 hover:text-slate-600 disabled:opacity-25 disabled:cursor-not-allowed transition"
                          title="Move down"
                        >
                          <Icon name="arrowDown" className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEdit(app)}
                          className="w-7 h-7 flex items-center justify-center rounded text-slate-300 hover:text-brand-600 transition"
                          title="Edit"
                        >
                          <Icon name="gear" className="w-3.5 h-3.5" />
                        </button>
                        {!builtin && (
                          <button
                            onClick={() => setDeleteConfirmId(app.id)}
                            className="w-7 h-7 flex items-center justify-center rounded text-slate-300 hover:text-red-500 transition"
                            title="Delete"
                          >
                            <Icon name="trash" className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Add button */}
          <div className="px-4 py-4 border-t border-slate-200 shrink-0">
            <button
              onClick={openAdd}
              className="w-full py-4 border-2 border-dashed border-slate-300 rounded font-bold text-slate-400 hover:border-brand-500 hover:text-brand-500 transition flex items-center justify-center gap-2"
            >
              <Icon name="plus" className="w-4 h-4" />
              Add Application
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto scroll-thin px-5 py-6 space-y-5">
            {/* Name */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 ml-1">
                App Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. FMECA Studio"
                className="w-full bg-white border border-slate-200 rounded p-2 text-sm outline-none focus:border-brand-500 transition shadow-sm"
              />
            </div>

            {/* URL — hand-added apps only; a built-in app's URL is fixed by the shell */}
            {!(editTarget && isBuiltinApp(editTarget)) && <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 ml-1">
                URL
              </label>
              <input
                type="url"
                value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                placeholder="https://your-app.example.com"
                className="w-full bg-white border border-slate-200 rounded p-2 text-sm font-mono outline-none focus:border-brand-500 transition shadow-sm"
              />
              <p className="text-xs text-slate-400 mt-1 ml-1">
                Icon is fetched from this URL automatically
              </p>
            </div>}

            {/* Description */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 ml-1">
                Description
              </label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Short description"
                className="w-full bg-white border border-slate-200 rounded p-2 text-sm outline-none focus:border-brand-500 transition shadow-sm"
              />
            </div>

            {/* Accent color */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 ml-1">
                Accent Color
              </label>
              <div className="flex gap-2 flex-wrap">
                {ACCENT_COLORS.map(color => {
                  const meta = ACCENT_META[color]
                  const selected = form.accent === color
                  return (
                    <button
                      key={color}
                      onClick={() => setForm(f => ({ ...f, accent: color }))}
                      className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded border transition ${
                        selected
                          ? 'border-slate-900 bg-slate-50 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                      title={meta.label}
                    >
                      <div className={`w-5 h-5 rounded-full ${meta.swatch}`} />
                      <span className="text-[9px] font-bold uppercase text-slate-400">{meta.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Form actions */}
          <div className="px-5 py-4 border-t border-slate-200 flex gap-3 shrink-0">
            <button
              onClick={() => setView('list')}
              className="flex-1 py-2 bg-white border border-slate-200 rounded font-bold text-slate-600 hover:bg-slate-50 transition text-sm flex items-center justify-center gap-2"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!form.name.trim()}
              className="flex-1 py-2 bg-slate-900 text-white rounded font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition text-sm flex items-center justify-center gap-2"
            >
              {editTarget ? 'Save Changes' : 'Add App'}
            </button>
          </div>
        </>
      )}
    </aside>
  )
}
