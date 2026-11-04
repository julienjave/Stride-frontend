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

// Guards against two source files whose import paths differ ONLY by letter
// case — e.g. `patients/PatientPage.tsx` and `patients/patientPage.ts`
// (found 2026-10-09, on Windows).
//
// Why it breaks: `import … from './PatientPage'` has no extension, so
// TypeScript tries `.ts` before `.tsx`. On a case-INsensitive file system
// (Windows, and macOS by default) `PatientPage.ts` matches the file
// `patientPage.ts`, resolution stops there, and the component file is
// never reached. On Linux (case-sensitive) both names are distinct and
// everything works — which is why it can slip through unnoticed there.
//
// import.meta.glob is Vite's (Vitest runs on Vite): it lists matching
// files at build time, as an object { path: loader }. Only the KEYS (the
// paths) are used here. Nothing is actually imported: without
// `eager: true`, each value is a function that would load the file when
// called — and none is ever called.
const sourceFiles = Object.keys(import.meta.glob('/src/**/*.{ts,tsx}'))

// The path an import would use: without the .ts / .tsx extension.
function importPath(file: string): string {
  return file.replace(/\.(ts|tsx)$/, '')
}

describe('source file names', () => {
  it('has no two files whose import paths differ only by letter case', () => {
    const byLowerCase = new Map<string, Set<string>>()
    for (const file of sourceFiles) {
      const path = importPath(file)
      const key = path.toLowerCase()
      byLowerCase.set(key, (byLowerCase.get(key) ?? new Set()).add(path))
    }
    const clashes = [...byLowerCase.values()]
      .filter((paths) => paths.size > 1)
      .map((paths) => [...paths].sort().join(' <-> '))

    expect(clashes).toEqual([])
  })

  it('actually sees the source files (the glob matches)', () => {
    // Without this, a glob that matched nothing would make the test above
    // pass while checking nothing.
    expect(sourceFiles).toContain('/src/patients/PatientPage.tsx')
  })
})