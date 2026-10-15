// Reload the app when one of its page files can't be downloaded — almost
// always because a NEW VERSION was deployed while this tab was open.
//
// Why it happens: since code splitting (routes.tsx), each page is its own
// file, named after its content (`ProgramsPage-Bx81kQ.js`), and the files
// of a version are fetched only when needed. Deploying a new version
// replaces those files. A tab opened yesterday still runs yesterday's app,
// which asks for yesterday's file names — and gets a 404. (With one big
// bundle this couldn't happen: everything was downloaded at once.)
//
// How we notice: Vite wraps every dynamic import() of a built app, and when
// one fails it fires a `vite:preloadError` event on window first. Calling
// preventDefault() on it means "handled — don't throw". Reloading then loads
// the NEW index.html, which names the new files: the visitor continues on
// the current version.
//
// The guard: if the file is missing for another reason (the server is
// down, the visitor is offline), reloading can't help, and reloading again
// and again would be a loop. So at most one automatic reload per
// RELOAD_COOLDOWN_MS, remembered in sessionStorage (it survives the reload,
// and belongs to this tab only). A second failure within that time is left
// alone: it reaches the router, which shows RouteErrorPage ("Reload the
// page", by hand).

export const RELOAD_KEY = 'stride-stale-chunk-reload'
export const RELOAD_COOLDOWN_MS = 10_000

// Pure: may we reload now, given when we last did (null = never)?
export function mayReloadNow(lastReloadAt: number | null, now: number): boolean {
  return lastReloadAt === null || now - lastReloadAt > RELOAD_COOLDOWN_MS
}

// sessionStorage can throw (a privacy mode, storage turned off) — even
// just READING `window.sessionStorage` can, in some browsers. Without it the
// cooldown can't be remembered, so there's NO automatic reload at all (the
// listener below): a reload that can't count itself could loop forever.
function sessionStorageOrNull(): Storage | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function readLastReload(storage: Storage): number | null {
  try {
    const stored = storage.getItem(RELOAD_KEY)
    const value = stored === null ? NaN : Number(stored)
    return Number.isFinite(value) ? value : null
  } catch {
    return null
  }
}

// True when the time was stored — the only case where reloading is safe.
function rememberReload(storage: Storage, now: number): boolean {
  try {
    storage.setItem(RELOAD_KEY, String(now))
    return true
  } catch {
    return false
  }
}

interface Dependencies {
  target: Pick<Window, 'addEventListener'>
  storage: Storage | null
  reload: () => void
  now: () => number
}

// Installed once, in main.tsx. Its parts are passed in (defaults: the real
// window, sessionStorage, location.reload and clock) so tests can watch
// what it does without reloading the test runner.
export function installStaleChunkReload({
  target = window,
  storage = sessionStorageOrNull(),
  reload = () => window.location.reload(),
  now = Date.now,
}: Partial<Dependencies> = {}) {
  target.addEventListener('vite:preloadError', (event) => {
    if (storage === null) return
    const current = now()
    if (!mayReloadNow(readLastReload(storage), current)) return
    // Remember FIRST: if it can't be remembered, don't reload (no loop).
    if (!rememberReload(storage, current)) return
    event.preventDefault()
    reload()
  })
}