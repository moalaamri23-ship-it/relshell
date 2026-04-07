import type { AppConfig, AccentColor } from './types'

export const STORAGE_KEY = 'reliability-hub-apps'
export const FAVICON_PREFIX = 'reliability-hub-favicon-'

export const DEFAULT_APPS: AppConfig[] = [
  {
    id: 'fmeca-studio',
    name: 'FMECA Studio',
    url: 'http://fmeca.moalaamri23.workers.dev',
    description: 'Failure Mode & Effects Analysis editor',
    accent: 'blue',
  },
  {
    id: 'failsense',
    name: 'FailSense',
    url: 'http://failsense.moalaamri23.workers.dev',
    description: 'AI-powered failure pattern detection',
    accent: 'amber',
  },
  {
    id: 'sap-auditor',
    name: 'SAP Auditor',
    url: 'http://auditor.moalaamri23.workers.dev',
    description: 'SAP PM reliability audit engine',
    accent: 'emerald',
  },
]

export interface AccentMeta {
  bar: string
  glowClass: string
  letterBg: string
  letterText: string
  swatch: string
  label: string
}

export const ACCENT_META: Record<AccentColor, AccentMeta> = {
  blue:    { bar: '#3b82f6', glowClass: '', letterBg: 'bg-blue-100',    letterText: 'text-blue-600',    swatch: 'bg-blue-500',    label: 'Blue'    },
  amber:   { bar: '#f59e0b', glowClass: '', letterBg: 'bg-amber-100',   letterText: 'text-amber-600',   swatch: 'bg-amber-500',   label: 'Amber'   },
  emerald: { bar: '#10b981', glowClass: '', letterBg: 'bg-emerald-100', letterText: 'text-emerald-600', swatch: 'bg-emerald-500', label: 'Emerald' },
  red:     { bar: '#ef4444', glowClass: '', letterBg: 'bg-red-100',     letterText: 'text-red-600',     swatch: 'bg-red-500',     label: 'Red'     },
  purple:  { bar: '#a855f7', glowClass: '', letterBg: 'bg-purple-100',  letterText: 'text-purple-600',  swatch: 'bg-purple-500',  label: 'Purple'  },
  slate:   { bar: '#64748b', glowClass: '', letterBg: 'bg-slate-100',   letterText: 'text-slate-600',   swatch: 'bg-slate-500',   label: 'Slate'   },
}

/** Priority-ordered icon URL candidates for a given app base URL */
export const getIconCandidates = (url: string): string[] => [
  `${url}/icon-512.png`,
  `${url}/icon-192.png`,
  `${url}/apple-touch-icon.png`,        // 180×180, universal high-res
  `${url}/apple-touch-icon-precomposed.png`,
  `${url}/favicon-196x196.png`,
  `${url}/favicon-128x128.png`,
  `${url}/favicon-96x96.png`,
  `${url}/favicon-32x32.png`,
  `${url}/favicon.png`,
  `${url}/favicon.ico`,                 // last resort — typically 16–32px
]

export const ACCENT_COLORS: AccentColor[] = ['blue', 'amber', 'emerald', 'red', 'purple', 'slate']
