import { describe, it, expect } from 'vitest'

// The convention behind failureText (api/apiErrors.ts, 2026-10-27): the
// words of a failure come from ONE function. Before, about 55 components read
// `error.messages` themselves — two separators, a dozen fallbacks, every 5xx
// shown as "Internal server error". This test keeps it that way: a component
// that reads an error's messages again fails here, with the file named.
// (The backend's twin is src/audit/audit-tags.spec.ts: a rule every route
// must follow, checked over all of them rather than remembered.)
//
// import.meta.glob with `query: '?raw'` gives each file's TEXT (Vite reads
// it at build time); `eager: true` puts the texts in the object directly.
// The application's code only: tests build and inspect errors on purpose.
const sources = import.meta.glob<string>('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
})

// The one file allowed to read an error's messages.
const RULE_FILE = '/src/api/apiErrors.ts'

// The socket's refusals (`MessageRefusedError`: sending and deleting a
// message) aren't ApiErrors, and api/ mustn't import messages/ — these two
// word them themselves, with the same rule for a 5xx (decisions §23).
const SOCKET_REFUSAL_FILES = ['/src/messages/ConversationPage.tsx', '/src/messages/DeleteMessageButton.tsx']

// `error.messages`, `mutation.error.messages`, `apiError.messages`… — a name
// ending in "error" or "Error", then `.messages` — or `.message` (an Error's
// own text: for an ApiError the server's words, 5xx included; for a dropped
// network the browser's "Failed to fetch". Widened 2026-10-28, the loading /
// error pass, pass 2: four actions read it). Not `page.messages` (a page of a
// conversation's messages, src/messages/), not `errors.title.message` (a
// form field's problem). A differently named variable (`e.messages`) would
// slip past: the review is the net for that.
const READS_ERROR_MESSAGES = /\w*[eE]rror\.messages?\b/

function isApplicationCode(path: string): boolean {
  return !path.endsWith('.test.ts') && !path.endsWith('.test.tsx')
}

// Reads an error's text to CLASSIFY it, never to show it: which errors the
// browser reports (a "Failed to fetch" is the network, not a bug — decisions
// §32, pass 3).
const CLASSIFYING_FILES = ['/src/observability/reportRules.ts']

// The files the rule is checked in.
const checked = Object.entries(sources).filter(
  ([path]) =>
    isApplicationCode(path) &&
    path !== RULE_FILE &&
    !SOCKET_REFUSAL_FILES.includes(path) &&
    !CLASSIFYING_FILES.includes(path),
)

describe('the words of a failure', () => {
  it('are read from an error only in api/apiErrors.ts', () => {
    const readers = checked
      .filter(([, text]) => READS_ERROR_MESSAGES.test(text))
      .map(([path]) => path)

    expect(readers).toEqual([])
  })

  // Without these, a glob that matched nothing — or a pattern that matched
  // nothing — would make the test above pass while checking nothing.
  it('sees the source files, and the pattern finds what it looks for', () => {
    expect(sources[RULE_FILE]).toMatch(READS_ERROR_MESSAGES)
    expect(Object.keys(sources)).toContain('/src/auth/LoginPage.tsx')
    expect('{mutation.error.messages.join(", ")}').toMatch(READS_ERROR_MESSAGES)
    expect('page.messages.map((m) => m)').not.toMatch(READS_ERROR_MESSAGES)
    expect('{start.error.message}').toMatch(READS_ERROR_MESSAGES)
    expect('{errors.title.message}').not.toMatch(READS_ERROR_MESSAGES)
    for (const path of SOCKET_REFUSAL_FILES) expect(Object.keys(sources)).toContain(path)
    // …and the filter keeps the application's components (one that dropped
    // every file would pass the test above too).
    const checkedPaths = checked.map(([path]) => path)
    expect(checkedPaths).toContain('/src/auth/LoginPage.tsx')
    expect(checkedPaths).toContain('/src/messages/MessageButton.tsx')
  })
})