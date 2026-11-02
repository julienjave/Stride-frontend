// The "Easier-to-read font" setting (design decisions §39), as plain
// functions — the same split as theme.ts: no React here, so each rule is a
// one-line test, and ThemeProvider only decides WHEN to call them.
//
// What it does: the app's text is set in Geist; turned on, it switches to
// Atkinson Hyperlegible Next, a typeface made by the Braille Institute for
// readers with low vision — letters that are easy to confuse (I / l / 1,
// O / 0) are drawn clearly different. Off by default.
//
// Stored per DEVICE, like the theme (the person's choice for now; the
// per-account version is in deferred-improvements.md).

// The localStorage key. index.html's pre-paint script reads it by its
// literal value too (it runs before any module loads) — themeScript.test.ts
// fails if the two copies ever disagree, as for the theme.
export const FONT_STORAGE_KEY = 'stride-font'

// The value stored when the setting is on. Off is stored as nothing at all
// (the key removed), so "never touched" and "turned off" are the same state.
export const READABLE_FONT_VALUE = 'readable'

// The class put on <html> while the setting is on. index.css gives it the
// other font: `.readable-font { --app-font: … }`.
export const READABLE_FONT_CLASS = 'readable-font'

// Anything stored other than exactly 'readable' — nothing, an old value, a
// typo made in devtools — means OFF: the default every visitor starts with.
export function parseReadableFont(raw: string | null): boolean {
  return raw === READABLE_FONT_VALUE
}

// Puts the class on <html> (or takes it off). On <html>, not on the app's
// root <div>: Radix menus and dialogs are drawn OUTSIDE that div (portalled
// to the end of <body>), and they must change font too — like `.dark`.
export function applyReadableFont(
  readable: boolean,
  root: HTMLElement = document.documentElement,
): void {
  root.classList.toggle(READABLE_FONT_CLASS, readable)
}

// localStorage can THROW (blocked storage, some private modes): a broken
// setting must never break the page, so both helpers fall back quietly —
// reading gives "off", writing still applies the choice for this visit.
export function readStoredReadableFont(): boolean {
  try {
    return parseReadableFont(localStorage.getItem(FONT_STORAGE_KEY))
  } catch {
    return false
  }
}

export function writeStoredReadableFont(readable: boolean): void {
  try {
    if (readable) {
      localStorage.setItem(FONT_STORAGE_KEY, READABLE_FONT_VALUE)
    } else {
      localStorage.removeItem(FONT_STORAGE_KEY)
    }
  } catch {
    // Not remembered next time; nothing else to do.
  }
}