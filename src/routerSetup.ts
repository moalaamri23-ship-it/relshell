/**
 * Router Set-up: each engineer's own copy of the OXY Connection Flow solution.
 *
 * Everyone imports into the same shared Power Platform environment (Personal
 * Productivity). A solution's components are matched by ID and unique name, so
 * a second person importing the base zip as is would hit the owner's flows
 * instead of getting their own. This rewrites, in the browser, everything that
 * identifies a component:
 *
 *   - flow IDs (Workflow), AI Builder model and configuration IDs
 *   - the solution's unique name
 *   - connection reference and environment variable schema names
 *
 * The new values are derived from the signed-in Teams email, so the same person
 * gets the same IDs for every version: importing a newer zip upgrades their own
 * copy instead of making a second one. Nothing leaves the browser.
 *
 * Not rewritten: anything that points outside the package (connector ids, the
 * AI Builder template id, SharePoint sites, the Copilot agent), the publisher.
 */

/** Where the base package is served from. Replace it with each router release. */
export const ROUTER_ZIP_URL = '/router/AIRouter.zip'

const GUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'

const sha256 = async (text: string): Promise<Uint8Array> =>
  new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))

const hex = (b: Uint8Array) => Array.from(b, x => x.toString(16).padStart(2, '0')).join('')

/** A stable GUID for one component of one person's copy (name-based, RFC 4122 layout). */
const derivedGuid = async (email: string, oldGuid: string): Promise<string> => {
  const b = (await sha256(`relshell-router|${email}|${oldGuid.toLowerCase()}`)).slice(0, 16)
  b[6] = (b[6] & 0x0f) | 0x50
  b[8] = (b[8] & 0x3f) | 0x80
  const h = hex(b)
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** The per-person tag: readable local part plus a short hash, e.g. `jsmith_3fa2`. */
export const personSuffix = async (email: string): Promise<string> => {
  const e = email.trim().toLowerCase()
  const local = (e.split('@')[0] ?? '').replace(/[^a-z0-9]/g, '').slice(0, 16) || 'user'
  return `${local}_${hex(await sha256(e)).slice(0, 4)}`
}

export interface PersonalRouter {
  blob: Blob
  fileName: string
  version: string
  /** The solution's unique name in this person's copy. */
  solutionName: string
}

/** The package version, read from solution.xml. */
export const readRouterVersion = async (base: ArrayBuffer): Promise<string> => {
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(base)
  const xml = await zip.file('solution.xml')?.async('string')
  return xml?.match(/<Version>([^<]+)<\/Version>/)?.[1] ?? ''
}

export const personalizeRouterZip = async (base: ArrayBuffer, rawEmail: string): Promise<PersonalRouter> => {
  const email = rawEmail.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('No valid email to build the copy for.')

  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(base)

  const solution = await zip.file('solution.xml')?.async('string')
  const custom = await zip.file('customizations.xml')?.async('string')
  if (!solution || !custom) throw new Error('This is not a Power Platform solution package.')

  const uniqueName = solution.match(/<SolutionManifest>\s*<UniqueName>([^<]+)<\/UniqueName>/)?.[1]
  const version = solution.match(/<Version>([^<]+)<\/Version>/)?.[1] ?? ''
  if (!uniqueName) throw new Error('The package has no solution name.')

  // Component IDs owned by this package.
  const ids = new Set<string>()
  for (const re of [
    new RegExp(`WorkflowId="\\{(${GUID})\\}"`, 'g'),
    new RegExp(`<msdyn_aimodelid>\\{?(${GUID})\\}?</msdyn_aimodelid>`, 'g'),
    new RegExp(`<msdyn_aiconfigurationid>\\{?(${GUID})\\}?</msdyn_aiconfigurationid>`, 'g'),
  ]) {
    for (const m of custom.matchAll(re)) ids.add(m[1].toLowerCase())
  }
  if (ids.size === 0) throw new Error('The package has no flows.')

  // Schema names owned by this package.
  const names = new Set<string>()
  for (const m of custom.matchAll(/connectionreferencelogicalname="([^"]+)"/g)) names.add(m[1])
  zip.forEach(path => {
    const m = path.match(/^environmentvariabledefinitions\/([^/]+)\//)
    if (m) names.add(m[1])
  })

  const suffix = await personSuffix(email)
  const newId = new Map<string, string>()
  for (const id of ids) newId.set(id, await derivedGuid(email, id))

  const idRe = new RegExp([...ids].map(escapeRe).join('|'), 'gi')
  const nameRe = names.size ? new RegExp(`\\b(${[...names].map(escapeRe).join('|')})\\b`, 'g') : null
  const local = suffix.replace(/_[0-9a-f]{4}$/, '')

  const rewrite = (text: string) => {
    let out = text.replace(idRe, m => {
      const g = newId.get(m.toLowerCase())!
      return m === m.toUpperCase() ? g.toUpperCase() : g
    })
    if (nameRe) out = out.replace(nameRe, n => `${n}_${suffix}`)
    return out
  }

  const out = new JSZip()
  const entries: Promise<void>[] = []
  zip.forEach((path, entry) => {
    if (entry.dir) return
    entries.push(entry.async('string').then(text => {
      let body = rewrite(text)
      if (path === 'solution.xml') {
        body = body
          .replace(
            /(<SolutionManifest>\s*<UniqueName>)[^<]+(<\/UniqueName>)/,
            `$1${uniqueName}_${suffix}$2`)
          .replace(
            /(<SolutionManifest>[\s\S]*?<LocalizedName description=")([^"]*)(")/,
            (_m, a: string, d: string, z: string) => `${a}${d} (${local})${z}`)
      }
      out.file(rewrite(path), body)
    }))
  })
  await Promise.all(entries)

  const blob = await out.generateAsync({ type: 'blob', mimeType: 'application/zip', compression: 'DEFLATE' })
  const solutionName = `${uniqueName}_${suffix}`
  return { blob, version, solutionName, fileName: `${solutionName}_${version.replace(/\./g, '_')}.zip` }
}
