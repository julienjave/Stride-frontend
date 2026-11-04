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

import { useEffect } from 'react'
import { Toast } from 'radix-ui'
import { CircleAlert, CircleCheck, XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { snackbarDuration, type Snackbar } from './snackbarRules'
import { clearSnackbars, closeSnackbar, useSnackbarStore } from './snackbarStore'

// The ONE place snackbars are drawn (decisions §33), rendered once by the
// signed-in layout (AuthenticatedLayout). Pages never draw one: they call
// showSuccess / showFailure (snackbarStore.ts) and this component, which
// reads the store, shows what's there.
//
// Built on Radix's Toast primitive (the person's choice — it ships inside
// the `radix-ui` package the app already uses, so no new dependency). What
// Radix does for us, checked in its source (@radix-ui/react-toast 1.3.1):
//   - the TIMER per row, PAUSED while the pointer is over the snackbars,
//     while one has keyboard focus, and while the window is in the
//     background (window `blur`) — resumed after;
//   - the ANNOUNCEMENT: each new row's text is put into a visually hidden
//     live region for a second (polite for a success, assertive for a
//     failure — the `type` prop below), so a screen reader says it without
//     focus ever moving there;
//   - a REGION landmark, "Notifications (F8)": F8 jumps to the snackbars
//     from anywhere, Tab moves between them, Escape closes the focused one;
//   - swipe to dismiss on a touch screen.
// What stays ours: the look, the timing rule (snackbarRules.ts), the list
// (snackbarStore.ts), and when the list is emptied (below).
//
// Focus is NEVER moved to a snackbar: the person is in the middle of
// something, and a confirmation must not take them out of it.
export function Snackbars({ identity }: { identity: string }) {
  // Subscribes to the store: this component re-renders when the list
  // changes, and only then. The selector picks the one field it needs.
  const snackbars = useSnackbarStore((state) => state.snackbars)

  // Emptied when the IDENTITY changes (`user id:role`, from the layout) and
  // when this component goes away: "You left Pat Lee's care team." is never
  // still on screen for the next person or role. An effect's clean-up runs
  // before the effect runs again with a new dependency — so a new identity
  // empties the list — and on unmount, which SIGN-OUT causes (the signed-in
  // layout goes away).
  //
  // Why not `key={identity}` on this component, as the messaging connection
  // has (pass 1 did that): a new key REMOUNTS it, and remounting Radix's
  // toast provider in the same update as a role switch — made from the
  // account menu, itself a Radix layer, still open — froze the screen on the
  // old role (found by the browser suite, 2026-10-31; decisions §34). No
  // unit test could see it: jsdom never showed the freeze. The list must be
  // emptied; nothing needs remounting.
  //
  // (In development React's StrictMode mounts, unmounts and mounts again
  // once, to surface missing clean-ups: that extra clean-up empties a list
  // that is still empty on a first mount — harmless.)
  useEffect(() => clearSnackbars, [identity])

  return (
    // The provider holds the shared settings and the bookkeeping Radix needs
    // (which rows exist, the paused state).
    //   label: the word put before each row's text when it is announced
    //     ("Notification Entry added.") — Radix requires a non-empty one.
    //   swipeDirection: swiping a row to the right dismisses it.
    <Toast.Provider label="Notification" swipeDirection="right">
      {snackbars.map((snackbar) => (
        <SnackbarRow key={snackbar.id} snackbar={snackbar} />
      ))}
      {/* The viewport: the fixed area the rows are drawn into (an <ol>,
          inside the "Notifications (F8)" region). Where it sits:
            - phone: across the bottom with the app's 16 px gutters, ABOVE
              the tab bar — 4rem (the bar) + the phone's safe-area strip +
              0.5rem of air; the same calc the layout's <main> pads with;
            - from md (768 px, where the tab bar is gone): bottom-right,
              24rem wide.
          z-[60]: above the header and tab bar (z-40) and above Radix's
          dialogs and menus (z-50) — a failure raised as a menu closes must
          not land underneath it.
          flex-col with gap: rows stack upwards in arrival order, the newest
          nearest the bottom edge. pointer-events-none on the area and
          -auto on the rows: the empty space around them doesn't block
          clicks on the page below. */}
      <Toast.Viewport
        className={cn(
          'pointer-events-none fixed inset-x-4 z-[60] m-0 flex list-none flex-col gap-2 p-0 outline-none',
          'bottom-[calc(4rem+env(safe-area-inset-bottom)+0.5rem)]',
          'md:inset-x-auto md:right-4 md:bottom-4 md:w-96',
        )}
      />
    </Toast.Provider>
  )
}

function SnackbarRow({ snackbar }: { snackbar: Snackbar }) {
  const isFailure = snackbar.kind === 'failure'
  const Icon = isFailure ? CircleAlert : CircleCheck

  return (
    <Toast.Root
      // CONTROLLED: open comes from the store. When Radix wants to close
      // the row (its timer ran out, Close, Escape, a swipe) it calls
      // onOpenChange(false); the store marks the row closed, `open` turns
      // false, and Radix plays the closing animation before removing it
      // from the screen.
      open={snackbar.open}
      onOpenChange={(open) => {
        if (!open) closeSnackbar(snackbar.id)
      }}
      // Success: 5–10 s by its length; failure: Infinity = stays until
      // closed (snackbarRules.ts).
      duration={snackbarDuration(snackbar.kind, snackbar.text)}
      // foreground = announced assertively (interrupts what the screen
      // reader is saying): right for something that went wrong. background
      // = politely, after the current sentence: right for a confirmation.
      type={isFailure ? 'foreground' : 'background'}
      className={cn(
        'pointer-events-auto flex items-start gap-3 rounded-lg border bg-popover p-3 text-sm text-popover-foreground shadow-lg',
        // The kind is said by the WORDS ("Couldn't…") and drawn by the
        // icon AND the border — never by colour alone.
        isFailure ? 'border-destructive/50' : 'border-green-600/40',
        // Opening and closing (tw-animate-css): a slide up and a fade.
        // Radix sets data-state="open" / "closed" on the row.
        'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-2',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
        // A swipe in progress: Radix gives the distance as a CSS variable
        // and data-swipe; the row follows the finger, springs back on
        // "cancel", and slides out on "end".
        'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-transform',
        'data-[swipe=end]:animate-out data-[swipe=end]:slide-out-to-right-full',
        // "Reduce motion" asked by the device: no slide, no fade.
        'motion-reduce:animate-none motion-reduce:transition-none',
      )}
    >
      {/* aria-hidden: the icon only repeats what the words say; a screen
          reader would otherwise read "image" before the sentence. (lucide
          already hides an icon given no label — checked in its source — so
          this only says the intent where it's read.) */}
      <Icon
        aria-hidden="true"
        className={cn('mt-0.5 size-4 shrink-0', isFailure ? 'text-destructive' : 'text-green-600')}
      />
      {/* Description, not Title: one sentence, no heading. Radix announces
          the row's whole text either way. */}
      <Toast.Description className="min-w-0 flex-1 wrap-break-word">{snackbar.text}</Toast.Description>
      {/* Close on every row — a failure has no other way to go. Radix
          leaves its own Close button OUT of the announcement. The name
          says what it closes; the icon is hidden from screen readers. */}
      <Toast.Close
        aria-label="Close notification"
        className="-m-1 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <XIcon aria-hidden="true" className="size-4" />
      </Toast.Close>
    </Toast.Root>
  )
}