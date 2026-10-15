import { Outlet } from 'react-router'
import { useCurrentUser } from '@/auth/useCurrentUser'
import type { UserRole } from '@/auth/schemas'
import { roleHomePath } from './roleHomePath'
import { Logo } from './layout/Logo'
import { SectionNav } from './layout/SectionNav'
import { SettingsMenu } from './layout/SettingsMenu'
import { UserMenu } from './layout/UserMenu'
import { NavigationProgress } from './layout/NavigationProgress'

// A LAYOUT route (element with no path, see routes.tsx) wrapping every
// authenticated page: whichever page matched renders where <Outlet /> is,
// and the navigation around it stays put. RequireAuth sits above this
// layout, so by the time it renders, a real session exists.
//
// The shape follows design decisions §1, with ONE breakpoint — Tailwind's
// `md` (768px) — deciding between two arrangements:
//
//   phone  (< 768px):  [Logo ················· Settings  Avatar]
//                      [          page content              ]
//                      [ Home | Patients | Library | …       ]  ← tab bar
//
//   tablet/desktop:    [Logo   Home Patients Library …   Settings  Avatar]
//                      [          page content              ]
//
// 768px is where an iPad in portrait starts, so tablets get the top bar
// (practitioners use tablets heavily, and a top bar suits wider screens),
// while phones get tabs within thumb reach.
//
// BOTH section navs are always in the DOM; CSS alone decides which one is
// visible (`hidden md:block` vs `md:hidden`). The alternative — measuring
// the window in JavaScript and rendering only one — would need a resize
// listener, and would briefly render the wrong one before the first
// measurement. CSS gets it right from the very first paint, for free.
export function AuthenticatedLayout() {
  const { data: user } = useCurrentUser()

  // Defensive only (RequireAuth guarantees a user): without one there's no
  // role to build navigation for, so render just the page.
  if (!user) {
    return <Outlet />
  }

  const role = user.activeRole as UserRole

  return (
    <div className="min-h-svh">
      {/* `sticky top-0`: the bar scrolls WITH the page until it reaches the
          top, then stays pinned there. `z-40` keeps it above page content,
          but below Radix menus and dialogs (z-50), which must cover it. */}
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Logo homePath={roleHomePath(role)} />
          {/* `mx-auto` inside a flex row pushes equal free space onto both
              sides, centering the sections between logo and menus. */}
          <SectionNav
            role={role}
            variant="top"
            className="mx-auto hidden md:block"
          />
          {/* `ml-auto` pushes the menus to the right edge. On desktop the
              section nav already takes the middle; on phones (where that
              nav is hidden) this is what keeps them right-aligned. */}
          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <SettingsMenu />
            <UserMenu />
          </div>
        </div>
        {/* Positioned against the header (sticky counts as positioned),
            so its bar sits on the header's bottom edge. */}
        <NavigationProgress />
      </header>

      {/* Bottom padding on phones only, equal to the tab bar's height, so
          the fixed bar never covers the end of a page. The calc adds the
          phone's safe-area inset (the home-indicator strip), which the tab
          bar itself also pads for. */}
      <main className="pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        <Outlet />
      </main>

      {/* The phone tab bar. `fixed bottom-0` pins it to the viewport, not
          the page. The safe-area padding needs index.html's
          `viewport-fit=cover`; without that, env(safe-area-inset-bottom)
          is always 0. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
        <SectionNav role={role} variant="bottom" />
      </div>
    </div>
  )
}