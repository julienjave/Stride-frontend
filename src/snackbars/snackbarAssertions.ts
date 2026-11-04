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

import { expect } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
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

// The same, WAITED for: a snackbar raised in a mutation's onSuccess appears
// after the request's answer, a moment after the click. A pattern matches
// the start of a long sentence (/^Copied 2 exercises/).
export async function findSnackbar(kind: SnackbarKind, text: string | RegExp): Promise<void> {
  await waitFor(() =>
    expect(
      raisedSnackbars().some(
        (raised) =>
          raised.kind === kind &&
          (typeof text === 'string' ? raised.text === text : text.test(raised.text)),
      ),
      `a ${kind} snackbar ${String(text)} — raised: ${JSON.stringify(raisedSnackbars())}`,
    ).toBe(true),
  )
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