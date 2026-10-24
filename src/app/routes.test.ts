import { afterEach, describe, expect, it, vi } from 'vitest'
import { isValidElement } from 'react'
import type { RouteObject } from 'react-router'
import { router } from './routes'
import { LoginPage } from '@/auth/LoginPage'
import { DashboardRedirect } from './DashboardRedirect'
import { RouteErrorPage } from './RouteErrorPage'
import { apiRequest } from '@/api/client'
import {
  forgetSignOutReason,
  STEP_UP_SIGNED_OUT_MESSAGE,
  wasSignedOutAfterStepUps,
} from '@/auth/currentPassword'

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

// The app's handler for a 401 in the middle of using it (registered by
// routes.tsx): to the sign-in page, with the way back — and, for the step-up's
// sign-out after 5 wrong passwords or codes (decisions §16), the reason the
// page's notice reads (remembered beside the navigation, not in its state).
describe('a 401 mid-session', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    forgetSignOutReason()
  })

  async function answer401(message: string) {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            statusCode: 401,
            message: [message],
            error: 'Unauthorized',
            timestamp: '2031-05-01T10:00:00.000Z',
            path: '/auth/password',
          }),
          { status: 401 },
        ),
      ),
    )
    await router.navigate('/profile/password')
    await expect(apiRequest('/auth/password', { method: 'POST' })).rejects.toThrow()
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(router.state.location.state).toStrictEqual({ from: '/profile/password' })
  }

  it('remembers why for the step-up sign-out', async () => {
    await answer401(STEP_UP_SIGNED_OUT_MESSAGE)
    expect(wasSignedOutAfterStepUps()).toBe(true)
  })

  it('remembers nothing for any other 401', async () => {
    await answer401('Unauthorized')
    expect(wasSignedOutAfterStepUps()).toBe(false)
  })
})