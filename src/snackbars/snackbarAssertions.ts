import { expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import { useSnackbarStore } from './snackbarStore'
import type { SnackbarKind } from './snackbarRules'

// Test helpers for the snackbars (decisions §33).
//
// A PAGE's test checks that the page RAISED the right snackbar — the store's
// list — not how it is drawn: the page's job ends at showSuccess(); drawing
// it is Snackbars.tsx's job, tested once in its own file. So a page test
// needs no <Snackbars /> in its harness, and doesn't depend on Radix's
// timers or portals.
export function raisedSnackbars(): { kind: SnackbarKind; text: string }[] {
  return useSnackbarStore
    .getState()
    .snackbars.filter((snackbar) => snackbar.open)
    .map(({ kind, text }) => ({ kind, text }))
}

export function expectSnackbar(kind: SnackbarKind, text: string): void {
  expect(raisedSnackbars()).toContainEqual({ kind, text })
}

// For tests that DO render <Snackbars />: the drawn rows live inside the
// "Notifications (F8)" region. Looking inside it matters — for its first
// second Radix ALSO puts each row's text in a hidden live region elsewhere
// in the page (the announcement), so a plain getByText would find two.
export function snackbarArea(): HTMLElement {
  return screen.getByRole('region', { name: /^Notifications/ })
}

export function drawnSnackbar(text: string): HTMLElement {
  // The row is the <li>; its text sits in a <div> inside it.
  const found = within(snackbarArea()).getByText(text).closest('li')
  if (!found) throw new Error(`No snackbar row around "${text}"`)
  return found
}