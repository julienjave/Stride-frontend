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
import { roleHomePath } from './roleHomePath'

// Small function, but two real call sites (DashboardRedirect and
// RoleSwitcher) depend on it agreeing with itself — this locks the
// mapping in place so a future edit to one path can't silently drift
// from the other caller's expectation.
describe('roleHomePath', () => {
  it('maps admin to /admin', () => {
    expect(roleHomePath('admin')).toBe('/admin')
  })

  it('maps practitioner to /practitioner', () => {
    expect(roleHomePath('practitioner')).toBe('/practitioner')
  })

  it('maps patient to /patient', () => {
    expect(roleHomePath('patient')).toBe('/patient')
  })
})