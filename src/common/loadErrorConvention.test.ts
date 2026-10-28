import { describe, it, expect } from 'vitest'

// The convention behind LoadError (Phase 6, the load-error pass,
// 2026-10-28): what a screen says when it can't load something comes from
// ONE place — "Couldn't load …" with its reason and "Try again"
// (common/loadErrorText.ts, drawn by common/LoadError.tsx). Before, about 40
// screens wrote their own sentence, most ending "Try refreshing", which
// reloads the whole app to repeat one request. This test keeps it that way:
// a component that writes such a sentence itself again fails here, with the
// file named — the twin of api/failureTextConvention.test.ts.
//
// import.meta.glob with `query: '?raw'` gives each file's TEXT (Vite reads it
// at build time). The application's code only: tests quote the sentences on
// purpose.
const sources = import.meta.glob<string>('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
})

// The one file allowed to write the sentence.
const RULE_FILE = '/src/common/loadErrorText.ts'

// Either apostrophe: one screen used the typographic one.
const OWN_LOAD_ERROR = /Couldn['’]t load|Try refreshing/

// Comments quote the old sentences to explain what changed — only code
// counts. Block comments (`/* … */`, JSX's `{/* … */}` included), then line
// comments — `//` not preceded by `:`, so "https://…" in a string stays.
function withoutComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

function isApplicationCode(path: string): boolean {
  return !path.endsWith('.test.ts') && !path.endsWith('.test.tsx') && !path.endsWith('Assertions.ts')
}

describe('the words of a failed load', () => {
  it('are written only in common/loadErrorText.ts', () => {
    const writers = Object.entries(sources)
      .filter(([path]) => isApplicationCode(path) && path !== RULE_FILE)
      .filter(([, text]) => OWN_LOAD_ERROR.test(withoutComments(text)))
      .map(([path]) => path)

    expect(writers).toEqual([])
  })

  // Without these, a glob that matched nothing, a pattern that matched
  // nothing, or a comment-stripper that removed everything would make the
  // test above pass while checking nothing.
  it('sees the source files, and the pattern finds what it looks for', () => {
    expect(OWN_LOAD_ERROR.test(withoutComments(sources[RULE_FILE]))).toBe(true)
    expect(Object.keys(sources)).toContain('/src/common/LoadError.tsx')
    expect(withoutComments('<p>Couldn’t load the audit log. Try refreshing.</p>')).toMatch(OWN_LOAD_ERROR)
    expect(withoutComments('// "Couldn\'t load this exercise. Try refreshing."')).not.toMatch(OWN_LOAD_ERROR)
    expect(withoutComments('{/* Try refreshing the page */}')).not.toMatch(OWN_LOAD_ERROR)
    expect(withoutComments("const url = 'https://x' // Couldn't load")).toBe("const url = 'https://x' ")
  })
})