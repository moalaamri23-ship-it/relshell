# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Reliability Shell** — a Citrix Workspace-style dark enterprise app launcher. Displays reliability engineering tools (FMECA Studio, FailSense, SAP Auditor) as full-screen tiles. Built with React 19 + TypeScript + Vite 6. Tailwind is loaded via CDN (no npm package); there is no router and no backend.

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
| `src/App.tsx` | Root — holds `apps` state, persists to `localStorage`, renders TopBar + tile grid + SettingsPanel + backdrop |
| `src/components/Icon.tsx` | Design-system Icon component — inline SVG paths, `stroke="currentColor"` |
| `src/components/TopBar.tsx` | Fixed header — logo, platform name, live clock, gear button |
| `src/components/AppTile.tsx` | 200×200 tile — colored top-bar, favicon with `.ico → .png` fallback chain, letter avatar, background re-fetch on click |
| `src/components/SettingsPanel.tsx` | Right slide-in panel — list/form views, add/edit/delete/reorder, accent color picker |

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

## Adding a New App Tile Field

1. Add the field to `AppConfig` in `types.ts`
2. Add it to the form in `SettingsPanel.tsx` (form state + input)
3. Use it in `AppTile.tsx` as needed
