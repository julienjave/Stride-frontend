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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Snackbars } from './Snackbars'
import { showFailure, showSuccess, useSnackbarStore } from './snackbarStore'
import { drawnSnackbar, snackbarArea } from './snackbarAssertions'
import { SUCCESS_MIN_MS } from './snackbarRules'

// The component that DRAWS the store's list (decisions §33): what a person
// sees and hears, the timers, closing, and the clean-up on unmount. Radix's
// Toast runs for real here (no mock) — this file is where its behaviour is
// pinned down, so an upgrade that changed it fails here.

describe('Snackbars', () => {
  beforeEach(() => {
    // Fake timers: the 5-second timer is moved forward instantly instead of
    // being waited for. shouldAdvanceTime keeps a slow real clock running
    // underneath, which user-event's own small pauses need.
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('draws a success in the Notifications (F8) region, with its icon hidden and a named Close', () => {
    render(<Snackbars identity="3:patient" />)
    act(() => showSuccess('Entry added.'))

    expect(snackbarArea()).toHaveAccessibleName('Notifications (F8)')
    const rowElement = drawnSnackbar('Entry added.')
    expect(within(rowElement).getByRole('button', { name: 'Close notification' })).toBeInTheDocument()
    // The icon repeats the words; a screen reader must not read it.
    expect(rowElement.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('announces a success politely and a failure assertively, without moving focus', async () => {
    render(
      <>
        <button>Where I was</button>
        <Snackbars identity="3:patient" />
      </>,
    )
    screen.getByRole('button', { name: 'Where I was' }).focus()
    act(() => showSuccess('Entry added.'))
    act(() => showFailure("Couldn't save your weight unit. Try again."))
    // Radix fills its hidden announcement on the next animation frame.
    await act(() => vi.advanceTimersByTimeAsync(50))

    // The announcements sit OUTSIDE the drawn area, in live regions; the
    // provider's label comes first ("Notification …").
    const polite = screen.getByText('Notification Entry added.')
    expect(polite.closest('[aria-live]')).toHaveAttribute('aria-live', 'polite')
    const assertive = screen.getByText("Notification Couldn't save your weight unit. Try again.")
    expect(assertive.closest('[aria-live]')).toHaveAttribute('aria-live', 'assertive')
    expect(screen.getByRole('button', { name: 'Where I was' })).toHaveFocus()
  })

  it('closes a success after its time', async () => {
    render(<Snackbars identity="3:patient" />)
    act(() => showSuccess('Entry added.'))

    await act(() => vi.advanceTimersByTimeAsync(SUCCESS_MIN_MS - 100))
    expect(drawnSnackbar('Entry added.')).toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(200))
    expect(within(snackbarArea()).queryByText('Entry added.')).not.toBeInTheDocument()
    // The store knows it's closed (it is dropped from the list later).
    expect(useSnackbarStore.getState().snackbars).toMatchObject([{ open: false }])
  })

  it('keeps a failure until it is closed', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<Snackbars identity="3:patient" />)
    act(() => showFailure("Couldn't save your weight unit. Try again."))

    await act(() => vi.advanceTimersByTimeAsync(10 * 60_000))
    const rowElement = drawnSnackbar("Couldn't save your weight unit. Try again.")

    await user.click(within(rowElement).getByRole('button', { name: 'Close notification' }))
    expect(within(snackbarArea()).queryByText(/Couldn't save/)).not.toBeInTheDocument()
  })

  it('pauses the timer while the pointer is over the snackbars', async () => {
    render(<Snackbars identity="3:patient" />)
    act(() => showSuccess('Entry added.'))

    // Radix listens for pointermove on the region and pointerleave to resume.
    fireEvent.pointerMove(snackbarArea())
    await act(() => vi.advanceTimersByTimeAsync(SUCCESS_MIN_MS * 3))
    expect(drawnSnackbar('Entry added.')).toBeInTheDocument()

    fireEvent.pointerLeave(snackbarArea())
    await act(() => vi.advanceTimersByTimeAsync(SUCCESS_MIN_MS + 100))
    expect(within(snackbarArea()).queryByText('Entry added.')).not.toBeInTheDocument()
  })

  it('pauses while the window is in the background (another tab or app)', async () => {
    render(<Snackbars identity="3:patient" />)
    act(() => showSuccess('Entry added.'))

    fireEvent.blur(window)
    await act(() => vi.advanceTimersByTimeAsync(SUCCESS_MIN_MS * 3))
    expect(drawnSnackbar('Entry added.')).toBeInTheDocument()

    fireEvent.focus(window)
    await act(() => vi.advanceTimersByTimeAsync(SUCCESS_MIN_MS + 100))
    expect(within(snackbarArea()).queryByText('Entry added.')).not.toBeInTheDocument()
  })

  it('closes the focused one with Escape', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<Snackbars identity="3:patient" />)
    act(() => showFailure("Couldn't save your email setting. Try again."))

    drawnSnackbar("Couldn't save your email setting. Try again.").focus()
    await user.keyboard('{Escape}')
    expect(within(snackbarArea()).queryByText(/Couldn't save/)).not.toBeInTheDocument()
  })

  it('draws at most three, the newest last', () => {
    render(<Snackbars identity="3:patient" />)
    act(() => {
      showSuccess('One.')
      showSuccess('Two.')
      showSuccess('Three.')
      showSuccess('Four.')
    })
    const texts = within(snackbarArea())
      .getAllByRole('listitem')
      .map((item) => item.textContent)
    expect(texts).toEqual(['Two.', 'Three.', 'Four.'])
  })

  // A role switch gives a new identity: the list is emptied, the component
  // NOT remounted — the same region element stays (a remount of Radix's
  // provider froze the role switch in the browser; decisions §34).
  it('empties the list when the identity changes, without remounting', () => {
    const { rerender } = render(<Snackbars identity="3:patient" />)
    act(() => showSuccess("You left Pat Lee's care team."))
    const region = snackbarArea()

    rerender(<Snackbars identity="3:practitioner" />)
    expect(useSnackbarStore.getState().snackbars).toEqual([])
    expect(snackbarArea()).toBe(region)
  })

  it('keeps the list when it re-renders for the same identity', () => {
    const { rerender } = render(<Snackbars identity="3:patient" />)
    act(() => showSuccess('Entry added.'))
    rerender(<Snackbars identity="3:patient" />)
    expect(useSnackbarStore.getState().snackbars).toHaveLength(1)
  })

  it('empties the list when it goes away (sign-out)', () => {
    const { unmount } = render(<Snackbars identity="3:patient" />)
    act(() => showSuccess("You left Pat Lee's care team."))
    unmount()
    expect(useSnackbarStore.getState().snackbars).toEqual([])
  })
})