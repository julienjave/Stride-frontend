import { describe, expect, it } from 'vitest'
import { isValidElement } from 'react'
import type { RouteObject } from 'react-router'
import { router } from './routes'
import { LoginPage } from '@/auth/LoginPage'
import { DashboardRedirect } from './DashboardRedirect'
import { RouteErrorPage } from './RouteErrorPage'

// The shell: the only PAGES allowed to be imported statically (routes.tsx
// says why). Any other page added with `element:` instead of `lazy:` would
// quietly go back into the file every visitor downloads first.
const STATIC_PAGES: unknown[] = [LoginPage, DashboardRedirect]

function allRoutes(routes: RouteObject[]): RouteObject[] {
  return routes.flatMap((route) => [route, ...allRoutes(route.children ?? [])])
}

// A page is a route with a path, or an INDEX route (the page shown at its
// parent's own address — Messages with no conversation open).
const pageRoutes = allRoutes(router.routes).filter(
  (route) => route.path !== undefined || route.index === true,
)

describe('the route tree', () => {
  it('has a root route covering every page with a loading fallback and an error page', () => {
    expect(router.routes).toHaveLength(1)
    const [root] = router.routes
    expect(root.path).toBeUndefined()
    expect(root.hydrateFallbackElement).toBeTruthy()
    expect(isValidElement(root.errorElement) && root.errorElement.type).toBe(RouteErrorPage)
  })

  it('loads every page on demand, except the shell', () => {
    for (const route of pageRoutes) {
      if (route.lazy) continue
      const component = isValidElement(route.element) ? route.element.type : undefined
      expect(STATIC_PAGES, `${route.path} should be lazy`).toContain(component)
    }
    // A sanity check that the loop above saw the lazy ones at all.
    expect(pageRoutes.filter((route) => route.lazy).length).toBeGreaterThan(25)
  })

  // A lazy route that resolves to nothing (a wrong export picked) would
  // show a blank page only when someone visits it. Load each one now.
  it('gives every lazy page a component', async () => {
    for (const route of pageRoutes) {
      if (typeof route.lazy !== 'function') continue
      const loaded = await route.lazy()
      expect(typeof loaded.Component, route.path).toBe('function')
    }
  })
})