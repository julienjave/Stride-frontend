import { afterEach, describe, expect, it, vi } from 'vitest'
import { isValidElement } from 'react'
import type { RouteObject } from 'react-router'
import { router } from './routes'
import { LoginPage } from '@/auth/LoginPage'
import { DashboardRedirect } from './DashboardRedirect'
import { RouteErrorPage } from './RouteErrorPage'
import { RecordsDownloadPage } from '@/records-export/RecordsDownloadPage'
import { SignedOutLayout } from './SignedOutLayout'
import { AuthenticatedLayout } from './AuthenticatedLayout'
import { RequireAuth } from './RequireAuth'
import { RequireGuest } from './RequireGuest'
import { FILLS_SCREEN } from './layout/fillsScreen'
import { apiRequest } from '@/api/client'
import { queryClient } from '@/api/queryClient'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
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

// The routes from the root down to the one at `path` — its ancestors, then
// itself — so a test can ask what a page sits inside (a layout, a guard).
function chainTo(path: string, routes = router.routes): RouteObject[] {
  for (const route of routes) {
    if (route.path === path) return [route]
    const below = chainTo(path, route.children ?? [])
    if (below.length > 0) return [route, ...below]
  }
  return []
}

// The component a route draws, when it has an `element` (a layout, a guard).
function elementType(route: RouteObject): unknown {
  return isValidElement(route.element) ? route.element.type : undefined
}

// A page is a route with a path, or an INDEX route (the page shown at its
// parent's own address — Messages with no conversation open).
const pageRoutes = allRoutes(router.routes).filter(
  (route) => route.path !== undefined || route.index === true,
)

describe('the route tree', () => {
  // Messages sizes itself to the window; the room AuthenticatedLayout adds
  // under every other page would make it scroll (decisions §47). Only
  // these two sections say they fill the screen.
  it('marks the two Messages sections, and only them, as filling the screen', () => {
    const marked = allRoutes(router.routes).filter((route) => route.handle === FILLS_SCREEN)
    expect(marked.map((route) => route.path).sort()).toEqual(['/patient/messages', '/practitioner/messages'])
  })

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

  // The records email's link (decisions §20): the patient may be unable to
  // sign in, so the page sits under NO guard (inside RequireAuth it would
  // send them to sign in; inside RequireGuest, a signed-in visitor away).
  it('serves the records download link outside every guard', async () => {
    const chain = chainTo('/records-download')
    const route = chain.at(-1)
    expect(route?.element).toBeUndefined()
    const above = chain.map(elementType)
    expect(above).not.toContain(RequireAuth)
    expect(above).not.toContain(RequireGuest)
    if (typeof route?.lazy !== 'function') throw new Error('/records-download should be lazy')
    expect((await route.lazy()).Component).toBe(RecordsDownloadPage)
  })

  // The logo above every signed-out page (decisions §39): each of them sits
  // inside SignedOutLayout, and no signed-in page does — one would show the
  // logo twice, under the top bar's.
  const SIGNED_OUT_PATHS = [
    '/login',
    '/forgot-password',
    '/register-clinic',
    '/accept-invitation',
    '/reset-password',
    '/confirm-email',
    '/cancel-email-change',
    '/records-download',
  ]

  it.each(SIGNED_OUT_PATHS)('draws %s inside the signed-out layout', (path) => {
    const above = chainTo(path).map(elementType)
    expect(above).toContain(SignedOutLayout)
    expect(above).not.toContain(AuthenticatedLayout)
  })

  it('keeps the signed-in pages out of the signed-out layout', () => {
    const signedIn = pageRoutes.filter((route) =>
      route.path !== undefined && !SIGNED_OUT_PATHS.includes(route.path),
    )
    expect(signedIn.length).toBeGreaterThan(25)
    for (const route of signedIn) {
      const above = chainTo(route.path as string).map(elementType)
      expect(above, route.path).not.toContain(SignedOutLayout)
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
    // Whose session it was: the way back carries its owner (returnPath.ts).
    queryClient.setQueryData(currentUserQueryKey, { id: 7 })
    await router.navigate('/profile/password')
    await expect(apiRequest('/auth/password', { method: 'POST' })).rejects.toThrow()
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(router.state.location.state).toStrictEqual({
      from: '/profile/password',
      fromUserId: 7,
    })
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