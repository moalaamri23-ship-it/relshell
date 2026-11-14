/**
 * localStorage that never throws.
 *
 * In Teams the shell runs as a third-party frame (teams.microsoft.com → shell).
 * When the host blocks third-party storage — a "block third-party cookies"
 * setting or policy, tracking prevention, a WebView2 profile — merely reading
 * `window.localStorage` throws a SecurityError ("Access is denied for this
 * document"). A read during render then unmounts the whole React tree and the
 * tab shows a blank page. The same URL opened top-level in Edge is first-party,
 * so it works there.
 *
 * Every storage access goes through these helpers: with storage blocked the shell
 * starts from its defaults and simply does not remember anything.
 */
export const storageGet = (key: string): string | null => {
  try { return window.localStorage.getItem(key) } catch { return null }
}

export const storageSet = (key: string, value: string): void => {
  try { window.localStorage.setItem(key, value) } catch { /* blocked or full */ }
}

export const storageRemove = (key: string): void => {
  try { window.localStorage.removeItem(key) } catch { /* blocked */ }
}
