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

import { Outlet } from 'react-router'
import { useCurrentUser } from '@/auth/useCurrentUser'
import type { UserRole } from '@/auth/schemas'
import { roleHomePath } from './roleHomePath'
import { Logo } from './layout/Logo'
import { SectionNav } from './layout/SectionNav'
import { SettingsMenu } from './layout/SettingsMenu'
import { UserMenu } from './layout/UserMenu'
import { NavigationProgress } from './layout/NavigationProgress'
import { useFillsScreen } from './layout/fillsScreen'
import { isMessagingRole, messagesPath, type MessagingRole } from '@/messages/messagesPath'
import { MessagingConnectionProvider } from '@/messages/MessagingConnectionProvider'
import { useUnreadMessageCount } from '@/messages/useConversations'
import { Snackbars } from '@/snackbars/Snackbars'

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
//
// Messaging (Phase 5) lives here too, because it must outlive any one page:
//   - the LIVE CONNECTION (MessagingConnectionProvider) opens once a user is
//     known and stays open across page changes — a message arriving while
//     the practitioner is on the Library still updates the badge;
//   - the Messages tab's unread BADGE.
// Both for practitioners and patients only: admins have no messaging.
export function AuthenticatedLayout() {
  const { data: user } = useCurrentUser()

  // Defensive only (RequireAuth guarantees a user): without one there's no
  // role to build navigation for, so render just the page.
  if (!user) {
    return <Outlet />
  }

  const role = user.activeRole as UserRole
  // Who is signed in, and as what: the key of everything that must start
  // over when that changes (the live connection, the snackbars).
  const identity = `${user.id}:${role}`

  return (
    <>
      {isMessagingRole(role) ? (
        // key: a NEW connection for a new identity. Switching role (or
        // logging in as someone else without a reload) changes the key, so
        // React unmounts the old provider — its cleanup closes the old
        // socket — and mounts a fresh one; the backend has also cut the old
        // session's sockets (disconnectSession). One socket never carries
        // two identities.
        <MessagingConnectionProvider key={identity} userId={user.id}>
          <MessagingShell role={role} />
        </MessagingConnectionProvider>
      ) : (
        <Shell role={role} />
      )}
      {/* The snackbars (decisions §33), once for every signed-in page —
          outside the page's <Outlet />, so one raised by a page that then
          navigates away survives the page. Given the identity, NOT keyed by
          it: a new identity empties the list (an effect in Snackbars.tsx) —
          a message about a patient is never left on screen for another
          role — without remounting it, which froze the role switch
          (decisions §34). Sign-out unmounts this whole layout, which empties
          it too. */}
      <Snackbars identity={identity} />
    </>
  )
}

// The unread count, read INSIDE the provider (its query is the one the
// connection keeps current) and handed to the nav as a badge on Messages.
function MessagingShell({ role }: { role: MessagingRole }) {
  // undefined until the list has loaded: no badge rather than a "0" flash.
  const { data: unread } = useUnreadMessageCount()
  return <Shell role={role} badges={{ [messagesPath(role)]: unread ?? 0 }} />
}

function Shell({ role, badges }: { role: UserRole; badges?: Record<string, number> }) {
  const fillsScreen = useFillsScreen()
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
            badges={badges}
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

      {/* The room at the bottom of every page, set HERE once (decisions
          §47) rather than by each page — before, about a third of the pages
          added their own `pb-8` and the rest ended flush against the edge.

          Phone: the tab bar is `fixed`, so it floats OVER the page; 4rem
          (its height) keeps it from covering the end of a page, + 2rem of
          breathing room, + the phone's safe-area inset (the home-indicator
          strip, which the tab bar pads for too). Desktop: no tab bar, just
          3rem (`pb-12`) of room.

          A page that fills the screen itself (Messages: a fixed height, its
          panes scrolling inside) gets ONLY the room the tab bar needs —
          anything more would make the whole page scroll. It says so with
          its route's handle (fillsScreen.ts).

          Both class sets are written out in full, never assembled from
          pieces: Tailwind finds the classes to generate by reading the
          source files as text, so `pb-[calc(${n}rem…)]` would never be
          generated. */}
      <main
        className={
          fillsScreen
            ? 'pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0'
            : 'pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-12'
        }
      >
        <Outlet />
      </main>

      {/* The phone tab bar. `fixed bottom-0` pins it to the viewport, not
          the page. The safe-area padding needs index.html's
          `viewport-fit=cover`; without that, env(safe-area-inset-bottom)
          is always 0. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
        <SectionNav role={role} variant="bottom" badges={badges} />
      </div>
    </div>
  )
}