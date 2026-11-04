/*
    Copyright 2026 Julien Javelaud

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
// -----------------------------------------------------------------------------------------------------------

import { describe, it, expect } from 'vitest'

// The convention behind the loading states (Phase 6, the loading / error
// pass, pass 2, 2026-10-28): what a screen shows while its data is on the way
// comes from common/Loading.tsx — nothing for 200 ms, then a sentence or a
// skeleton in a status region. Before, about 70 screens wrote their own
// `<p>Loading…</p>`: shown at once (a flash for every fast answer), and
// announced by no screen reader. This test keeps it that way: a component
// that writes such a text itself again fails here, with the file named — the
// twin of common/loadErrorConvention.test.ts.
//
// What it looks for: JSX TEXT starting with "Loading" (`>Loading…<`,
// `> Loading the file… <`). A string given to a component is fine — that's
// how the shared ones are used (`<Loading label="Loading clinics…" />`), and
// a button's own busy words (`'Loading…' : 'Load earlier messages'`) aren't
// a loading state.
const sources = import.meta.glob<string>('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
})

// The one file allowed to draw a loading state.
const RULE_FILE = '/src/common/Loading.tsx'

const OWN_LOADING_TEXT = />\s*Loading[^<{]*</

// Comments quote the old markup to explain what changed — only code counts
// (the same stripper as the load-error convention).
function withoutComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

function isApplicationCode(path: string): boolean {
  return !path.endsWith('.test.ts') && !path.endsWith('.test.tsx')
}

// The files the rule is checked in: every application file but the rule's.
const checked = Object.entries(sources).filter(([path]) => isApplicationCode(path) && path !== RULE_FILE)

describe('a loading state', () => {
  it('is drawn only by common/Loading.tsx', () => {
    const writers = checked
      .filter(([, text]) => OWN_LOADING_TEXT.test(withoutComments(text)))
      .map(([path]) => path)

    expect(writers).toEqual([])
  })

  // Without these, a glob or a pattern that matched nothing would make the
  // test above pass while checking nothing.
  it('sees the source files, and the pattern finds what it looks for', () => {
    expect(Object.keys(sources)).toContain(RULE_FILE)
    // …and the filter keeps the application's pages (a filter that dropped
    // every file would pass the test above too).
    const checkedPaths = checked.map(([path]) => path)
    expect(checkedPaths).toContain('/src/patients/PatientsListPage.tsx')
    expect(checkedPaths).toContain('/src/app/home/patient/PatientHomeSections.tsx')
    expect(checkedPaths).not.toContain(RULE_FILE)
    expect('<p className="text-sm">Loading your patients…</p>').toMatch(OWN_LOADING_TEXT)
    expect('<p>\n        Loading…\n      </p>').toMatch(OWN_LOADING_TEXT)
    expect('<Loading label="Loading clinics…" />').not.toMatch(OWN_LOADING_TEXT)
    expect("{thread.isFetchingNextPage ? 'Loading…' : 'Load earlier messages'}").not.toMatch(OWN_LOADING_TEXT)
    expect(withoutComments('// <p>Loading…</p>')).not.toMatch(OWN_LOADING_TEXT)
  })
})