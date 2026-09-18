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