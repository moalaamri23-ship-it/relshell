# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Reliability Shell** — a Citrix Workspace-style enterprise app launcher. Displays reliability engineering tools (FMECA Studio, FailSense, SAP Auditor) as full-screen tiles. Built with React 19 + TypeScript + Vite 6. Tailwind is loaded via CDN (no npm package); there is no router and no backend.

Deployed at `relshell.moalaamri23.workers.dev` via Cloudflare Workers (GitHub integration — push to `main` triggers auto-deploy).

## Commands

```bash
npm install        # first-time setup
npm run dev        # dev server at http://localhost:5173
npm run build      # tsc + vite build → dist/
npm run preview    # serve dist/ locally
```

## Architecture

| File | Role |
|------|------|
| `index.html` | Tailwind CDN, tailwind config override, custom CSS (dot-grid background, per-accent glow classes, staggered animation classes) |
| `src/types.ts` | `AppConfig` interface + `AccentColor` union type |
| `src/constants.ts` | `DEFAULT_APPS`, `STORAGE_KEY`, `FAVICON_PREFIX`, `ACCENT_META` (hex bar color, Tailwind classes, glow class per accent), `ACCENT_COLORS` array |
| `src/App.tsx` | Root — holds `apps` + `activeApp` state, persists to `localStorage`, renders TopBar + tile grid + SettingsPanel; all app iframes are preloaded and kept alive with `visibility` toggling; Escape key closes active app |
| `src/components/Icon.tsx` | Design-system Icon component — inline SVG paths, `stroke="currentColor"` |
| `src/components/TopBar.tsx` | Fixed header — logo, platform name, live clock, gear button |
| `src/components/AppTile.tsx` | 200×200 tile — colored top-bar, favicon with fallback chain, letter avatar, background re-fetch on click |
| `src/components/SettingsPanel.tsx` | Right slide-in panel — list/form views, add/edit/delete/reorder, accent color picker |

## Iframe Strategy

All app iframes are **preloaded on mount** (not conditionally rendered) and kept alive using `visibility: hidden` / `visibility: visible` toggling. This avoids reload on every open. The shell UI is hidden behind the active app via the same visibility mechanism.

A hover zone (`w-16 h-16`, top-left corner) reveals a back arrow button (`opacity-0 group-hover:opacity-100`) to return to the shell. Escape key also closes.

`loadApps()` migrates any cached `http://` URLs to `https://` on load (mixed-content fix for Cloudflare deployments).

## Fullscreen

The shell fullscreens the **root wrapper div** (`rootRef`), never `document.documentElement`.

**Chromium will not grant fullscreen to a cross-origin iframe while the embedding
document already holds fullscreen.** The child's `requestFullscreen()` never
settles — it does not reject, and no `fullscreenerror` fires — so an embedded
app's own fullscreen button looks dead. The request cannot be revived: releasing
the shell's fullscreen afterwards does not complete it. Verified by A/B test; a
same-origin child in the identical markup works.

So the shell steps aside *before* the app asks, over `postMessage`:

| Direction | Message | When |
|---|---|---|
| app → shell | `{ fs: 'request' }` | from the click, before requesting |
| shell → app | `{ fs: 'clear' }` | after the shell has exited its own fullscreen |
| app → shell | `{ fs: 'released' }` | when the app leaves fullscreen |

The app keeps transient activation across the round-trip, so its request still
counts as user-initiated. `{ fs: 'released' }` makes the shell re-enter — which
works only when the app exited from a **click** (activation propagates up the
frame tree); after **Esc** there is no activation and the shell stays windowed.

Messages are honoured only from an origin matching one of the configured app
URLs. Do **not** add "auto-heal" that exits on seeing `document.fullscreenElement
=== iframe` — after a handshake that is the success state, and exiting there
tears down the app's fullscreen.

App side: `services/ShellFullscreen.ts` in each embedded app (currently only
FMECA Studio has a fullscreen button; SAP Auditor and Pro ODS Simulator use no
Fullscreen API). A host that does not speak the protocol never replies, so a
400 ms timeout requests anyway — standalone behaviour is unchanged.

**Esc always exits every level at once.** `exitFullscreen()` pops one level, but
a user-initiated Esc runs the spec's *fully exit fullscreen* algorithm. The
Escape handler in `App.tsx` returns early while `document.fullscreenElement` is
set, so one Esc does not also unwind shell state.

## Design System

Follows the **reliability_app_UI** skill spec with a dark-launcher override:

- Body background: `slate-900` (not the standard `slate-50`)
- Tailwind config extends: `slate.950`, `brand.400–700`
- Per-accent glow CSS classes (`tile-glow-blue`, etc.) and staggered entry animations are defined in `index.html <style>` — not in component files
- `ACCENT_META` in `constants.ts` is the single source of truth for accent colors (bar hex, Tailwind classes, glow class)

## State & Persistence

- App list: `localStorage["reliability-hub-apps"]` — seeded from `DEFAULT_APPS` on first load
- Favicons: `localStorage["reliability-hub-favicon-{url}"]` — set on successful `<img>` load, updated in background on every tile click
- No external state library; plain `useState` + `localStorage` write-through

## Embedded Apps (Cloudflare Workers)

All three embedded apps (FMECA Studio, FailSense, SAP Auditor) are deployed as **Cloudflare Workers** with static assets at `*.moalaamri23.workers.dev`. Cloudflare automatically injects `X-Frame-Options: SAMEORIGIN` on `workers.dev` domains, blocking iframe embedding.

The fix is a `worker.ts` + `wrangler.jsonc` in each app repo that intercepts every response and strips `X-Frame-Options`:

```ts
// worker.ts
export default {
  async fetch(request: Request, env: { ASSETS: Fetcher }): Promise<Response> {
    const response = await env.ASSETS.fetch(request)
    const r = new Response(response.body, response)
    r.headers.delete('X-Frame-Options')
    r.headers.set('Content-Security-Policy', "frame-ancestors *")
    return r
  },
} satisfies ExportedHandler<{ ASSETS: Fetcher }>
```

Each app also has `public/_headers` with `frame-ancestors *` and `functions/_middleware.ts` (Pages Function) as belt-and-suspenders, though neither is effective for Workers — only `worker.ts` is.

GitHub repos: `moalaamri23-ship-it/relshell`, `moalaamri23-ship-it/fmeca`, `moalaamri23-ship-it/Auditor`, `moalaamri23-ship-it/FailSense`

## Adding a New App Tile Field

1. Add the field to `AppConfig` in `types.ts`
2. Add it to the form in `SettingsPanel.tsx` (form state + input)
3. Use it in `AppTile.tsx` as needed
