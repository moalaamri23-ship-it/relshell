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

## Shared settings and built-in apps

Settings → **Shared settings** holds the OXY Connection Flow URL and the engineer's
company email (`localStorage["reliability-hub-shared-settings"]`, `src/sharedSettings.ts`).
Each app runs on its own origin and cannot read the shell's storage, so the values go
over `postMessage`:

| Direction | Message | When |
|---|---|---|
| app → shell | `{ cfg: 'request' }` | when the app loads inside a frame |
| shell → app | `{ cfg: 'settings', aiRouterUrl?, engineerEmail? }` | in reply, and to every built-in frame on Save |

Blank fields are left out. The URL is a signed secret, so the shell answers **built-in
app origins only** (`DEFAULT_APPS`), never apps added by hand. App side:
`ShellSettings.ts` / `shellSettings.ts` in each app accepts the reply only from the
shell's origin (or localhost) and lets a filled value replace the app's own, so a
rotated URL reaches every app. Only FMECA Studio has an email field today.

Built-in apps (`BUILTIN_APP_IDS`) have a fixed URL, no URL field in Edit and no Delete.
`loadApps()` forces their URL back to the shipped one and re-adds any missing; only
hand-added apps keep a URL field and Delete.

### Identity from Teams

The shell is a custom Teams app, so Teams gives it context. `src/teamsIdentity.ts`
loads `@microsoft/teams-js` (lazy chunk, only when framed), and `app.getContext()`
returns the user's UPN and address-book name. App then sets **Company email** to that
UPN (pushed to built-in apps like a Save) and locks the field in Settings
("From your Microsoft Teams account"). The top bar shows "Welcome <name>" with the address-book name **exactly as Microsoft
shows it** ("Al Amri, Mohamed S"; never reordered). Teams usually leaves `displayName`
out of the context, so the shell asks the OXY Connection Flow (router task
`user_profile`, router v1.5, SharePoint user profiles) on Settings → Save, and on load
only when it holds no name for the current email (a refresh does not call the flow);
this works in a browser too when the email and flow URL are set. Only when neither
source has a name is one read from the email (`nameFromEmail`). The last answer is kept in `localStorage["reliability-hub-identity"]`
so the greeting shows before Teams replies. Outside Teams (browser, preview, any other
frame) `app.initialize()` gets no answer; after 5 s the shell keeps the typed email.
Teams marks these values a **hint, not proof**: use them to fill and greet, never to
grant access.

## Install page (PWA)

`/downloadapp` is `public/downloadapp.html`, a static page shared in Teams so
people can install the shell as a PWA from Edge or Chrome. It is not part of the
React app and the main UI has no install button.

- One app identity: `/` and `/downloadapp` link the same
  `public/manifest.webmanifest` (`id` `/`, `start_url` `/`, `scope` `/`,
  `display: standalone`), so installing from the install page opens the normal shell.
- `public/sw.js` exists only for installability: navigations go to the network,
  nothing is cached, an offline page answers only when the network is down.
- Routing: Workers static assets' default `html_handling` serves
  `downloadapp.html` at `/downloadapp` and 307s `/downloadapp.html` and
  `/downloadapp/` to it. Do not move it to `downloadapp/index.html` (that makes
  `/downloadapp` redirect to the slash form).
- Teams' embedded browser (WebView2) cannot install apps; the page detects a
  frame or a `Teams/` UA and tells the user to open the link in Edge.

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
- **Never touch `localStorage` directly** — use `src/safeStorage.ts` (`storageGet/Set/Remove`) or a try/catch. In Teams the shell is a third-party frame; when the host blocks third-party storage, reading `window.localStorage` throws `SecurityError`, and a read during render blanked the whole tab (AppTile favicon cache, fixed 2026-11-14). Works in Edge because top-level is first-party.
- Startup never shows a blank page: `StartupErrorBoundary` (`src/components/StartupError.tsx`) wraps `<App>` with an error + Retry screen, and `index.html` holds a boot placeholder that turns into "did not load" + Retry after 15 s if the bundle never renders.

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
