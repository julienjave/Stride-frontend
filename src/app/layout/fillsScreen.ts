import { useMatches } from 'react-router'

// How a ROUTE tells the layouts above it "I fill the screen myself".
//
// AuthenticatedLayout gives every page room at its bottom (decisions §47):
// without it, the last card of a page sat right against the window's edge
// (desktop) or the tab bar (phone). One page must NOT get that room:
// Messages sizes itself to exactly the window minus the bars, so that the
// conversation list and the thread scroll INSIDE themselves and the
// composer stays at the bottom. Room added under it would make the whole
// page scroll by that much.
//
// The layout can't know which page matched by looking at its own children
// (it only renders an <Outlet />). React Router's answer is a route's
// `handle`: any value you attach to a route object in routes.tsx, which
// the router hands back, for every route currently matched, through
// useMatches(). It's the documented way for a page to pass a fact UP to
// its layouts (breadcrumbs are the classic example). The alternative — the
// layout comparing the URL against '/practitioner/messages' and
// '/patient/messages' — would duplicate those paths in a second place,
// and a new full-screen page would have to be remembered there too.
export interface PageHandle {
  fillsScreen?: boolean
}

// The handle routes.tsx attaches to a page that fills the screen.
export const FILLS_SCREEN: PageHandle = { fillsScreen: true }

// `handle` is typed `unknown` by React Router (each app puts what it wants
// there), so this checks its shape instead of asserting it with `as`: a
// route whose handle is something else entirely just reads as "no".
function fillsScreen(handle: unknown): boolean {
  return typeof handle === 'object' && handle !== null && 'fillsScreen' in handle && handle.fillsScreen === true
}

// True when ANY matched route fills the screen. `some`, not "the last
// match": the handle sits on the Messages LAYOUT route, and the deepest
// match is its child (the open conversation, or the index) — the whole
// section fills the screen, whichever child is open.
export function useFillsScreen(): boolean {
  return useMatches().some((match) => fillsScreen(match.handle))
}
