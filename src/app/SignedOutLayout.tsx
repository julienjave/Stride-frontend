import { Outlet } from 'react-router'
import { LogoImages } from './layout/Logo'

// A LAYOUT route (an element with no path, see routes.tsx) around every page
// someone sees WITHOUT the signed-in navigation: the sign-in page, "forgot
// password", the clinic set-up, and the pages an email links to (invitation,
// password reset, email change, records download). It draws the Stride logo,
// centred above each page's own heading (design decisions §39), and the page
// renders where <Outlet /> is.
//
// WHY A LAYOUT ROUTE rather than the logo pasted into each page: these eight
// pages (and their several states each — loading, a dead link, done…) would
// otherwise need the same lines sixteen times, and the next signed-out page
// would have to remember them. AuthenticatedLayout does the same for the
// signed-in pages. It wraps the routes whatever their guard: RequireGuest's
// pages (sign-in…) and the unguarded email-link pages alike — a layout only
// draws; the guards below it still decide who may stay.
export function SignedOutLayout() {
  return (
    <>
      {/* `pt-16` (64 px) from the top; the pages below now start `mt-8`
          after it (they had `mt-24`, which with the logo above would leave
          a gap). `alt="Stride"`: here the logo is content — the brand, before
          the page's heading — not decoration inside a link. `h-12` (48 px),
          bigger than the top bar's 28 px: alone at the top of a page, the
          logo is the first thing seen. */}
      <div className="flex justify-center px-4 pt-16">
        <LogoImages alt="Stride" className="h-12" />
      </div>
      <Outlet />
    </>
  )
}