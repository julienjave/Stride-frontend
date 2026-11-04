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
import { isValidElement } from 'react'
import type { RouteObject } from 'react-router'
import { SECTIONS_BY_ROLE } from './sections'
import { roleHomePath } from '@/app/roleHomePath'
import { router } from '@/app/routes'
import { userRoleSchema } from '@/auth/schemas'
import { RequireRole } from '@/app/RequireRole'

// Every path declared anywhere in the real route tree, walking into nested
// layout/guard routes (which have children but no path of their own).
function collectPaths(routes: RouteObject[]): string[] {
  return routes.flatMap((route) => [
    ...(route.path ? [route.path] : []),
    ...collectPaths(route.children ?? []),
  ])
}

const allPaths = collectPaths(router.routes)

// These are the RULES from design decisions §1, written as tests so a
// future edit to sections.ts can't quietly break one.
describe.each(userRoleSchema.options)('%s sections', (role) => {
  const sections = SECTIONS_BY_ROLE[role]

  it('fits in a phone tab bar (five at most)', () => {
    expect(sections.length).toBeLessThanOrEqual(5)
  })

  it("starts with Home, pointing at the role's own home and matching exactly", () => {
    expect(sections[0]).toMatchObject({
      label: 'Home',
      to: roleHomePath(role),
      end: true,
    })
    // Only Home needs exact matching; on any other section it would
    // un-highlight the tab as soon as you open something inside it.
    expect(sections.slice(1).every((section) => !section.end)).toBe(true)
  })

  it('does not include Profile (it lives in the account menu)', () => {
    expect(sections.map((section) => section.label)).not.toContain('Profile')
  })

  it("keeps every section inside the role's own URL space", () => {
    // /practitioner/…, /patient/…, /admin/… — each section must sit under
    // the same RequireRole guard as the role's home.
    for (const section of sections.slice(1)) {
      expect(section.to.startsWith(`${roleHomePath(role)}/`)).toBe(true)
    }
  })

  it('links only to routes that exist', () => {
    // A nav entry for a path with no route would be a dead link that
    // renders nothing — the kind of mistake that's easy to make when a
    // section is added to sections.ts but not to routes.tsx.
    for (const section of sections) {
      expect(allPaths).toContain(section.to)
    }
  })
})

// The account menu's Profile entry isn't a section, so the checks above
// don't cover it. /profile must exist AND sit outside every RequireRole
// guard — otherwise it would work for one role and bounce the others.
describe('/profile route', () => {
  // Like collectPaths, but also remembers whether any ancestor on the way
  // down is a RequireRole guard (identified by its element's component).
  function findRoute(
    routes: RouteObject[],
    path: string,
    insideRoleGuard = false,
  ): { insideRoleGuard: boolean } | undefined {
    for (const route of routes) {
      const guarded =
        insideRoleGuard ||
        (isValidElement(route.element) && route.element.type === RequireRole)
      if (route.path === path) {
        return { insideRoleGuard: guarded }
      }
      const found = findRoute(route.children ?? [], path, guarded)
      if (found) {
        return found
      }
    }
    return undefined
  }

  it('exists, outside every role guard, so every role can reach it', () => {
    expect(findRoute(router.routes, '/profile')).toEqual({
      insideRoleGuard: false,
    })
  })

  it('sanity check: a role-only page IS detected as guarded', () => {
    // Proves the helper can tell the difference at all — without this, a
    // helper that always answered "false" would pass the test above.
    expect(findRoute(router.routes, '/practitioner/library')).toEqual({
      insideRoleGuard: true,
    })
  })
})