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

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type FailedQuery, LoadError } from './LoadError'
import { useRetryFocus } from './useRetryFocus'

// What replaces a LoadError once its retry worked: content whose heading
// uses the hook, as the pages do.
function Content({ what, shown = true }: { what: string; shown?: boolean }) {
  const heading = useRetryFocus<HTMLHeadingElement>(what, shown)
  return (
    <h1 ref={heading} tabIndex={-1}>
      The content
    </h1>
  )
}

// A failed request whose retry's answer the test releases (see
// LoadError.test.tsx: in the browser the pressed block unmounts as soon as
// the retry starts).
function heldRetry() {
  let answer: (result: { isError: boolean }) => void = () => {}
  const refetch = vi.fn(() => new Promise<{ isError: boolean }>((resolve) => (answer = resolve)))
  const failed: FailedQuery = { isError: true, error: new TypeError('Failed to fetch'), isFetching: false, refetch }
  return { failed, works: () => answer({ isError: false }), fails: () => answer({ isError: true }) }
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

// Press "Try again" on a block for `what`, which then unmounts (the page
// shows its loading state while the retry runs).
async function pressAndLeave(what: string) {
  const user = userEvent.setup()
  const retry = heldRetry()
  const { unmount } = render(<LoadError what={what} queries={[retry.failed]} />)
  await user.click(screen.getByRole('button', { name: 'Try again' }))
  unmount()
  return retry
}

const heading = () => screen.getByRole('heading', { name: 'The content' })

describe('useRetryFocus', () => {
  it('a retry that worked, answered BEFORE the content appears: its heading takes focus', async () => {
    const retry = await pressAndLeave('the list A')
    retry.works()
    await settle()
    render(<Content what="the list A" />)
    expect(heading()).toHaveFocus()
  })

  // The other order — React may render the content before the refetch's
  // promise runs its `.then`.
  it('…answered AFTER it appears: the heading takes focus all the same, and the memory is spent', async () => {
    const retry = await pressAndLeave('the list B')
    render(<Content what="the list B" />)
    expect(heading()).toHaveFocus()
    retry.works()
    await settle()
    // The late answer brings nothing back: a later error isn't "Still".
    render(<LoadError what="the list B" queries={[heldRetry().failed]} />)
    expect(screen.getByRole('alert')).toHaveTextContent(/^Couldn't load the list B\./)
  })

  it('content that arrives without a press takes no focus (an ordinary first load)', () => {
    render(<Content what="the list C" />)
    expect(heading()).not.toHaveFocus()
  })

  it('a press for something ELSE moves nothing', async () => {
    const retry = await pressAndLeave('the list D')
    retry.works()
    await settle()
    render(<Content what="another list" />)
    expect(heading()).not.toHaveFocus()
  })

  it('is spent once taken: the same content shown again later takes no focus', async () => {
    const retry = await pressAndLeave('the list E')
    retry.works()
    await settle()
    render(<Content what="the list E" />).unmount()
    render(<Content what="the list E" />)
    expect(heading()).not.toHaveFocus()
  })

  it('a heading ALWAYS on screen takes focus when its content turns up (`shown`)', async () => {
    const retry = await pressAndLeave('the list F')
    const { rerender } = render(<Content what="the list F" shown={false} />)
    expect(heading()).not.toHaveFocus()
    retry.works()
    await settle()
    rerender(<Content what="the list F" shown />)
    expect(heading()).toHaveFocus()
  })

  // The data was on screen and a later refetch failed: the block stayed
  // while retrying, and is still there when the good answer arrives.
  it('a retry that worked IN PLACE: the content that replaces the block takes focus', async () => {
    const user = userEvent.setup()
    const retry = heldRetry()
    const { rerender } = render(<LoadError what="the list G" queries={[retry.failed]} />)
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    retry.works()
    await settle()
    rerender(<Content what="the list G" />)
    expect(heading()).toHaveFocus()
  })

  it('a retry that FAILED leaves nothing for content shown later', async () => {
    const retry = await pressAndLeave('the list H')
    retry.fails()
    await settle()
    // The replacing block takes it ("Still…")…
    render(<LoadError what="the list H" queries={[heldRetry().failed]} />).unmount()
    // …so content appearing afterwards doesn't take focus.
    render(<Content what="the list H" />)
    expect(heading()).not.toHaveFocus()
  })

  it('forgets a press after 30 seconds', async () => {
    const retry = await pressAndLeave('the list I')
    retry.works()
    await settle()
    const now = Date.now()
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now + 30_000)
    try {
      render(<Content what="the list I" />)
      expect(heading()).not.toHaveFocus()
    } finally {
      clock.mockRestore()
    }
  })
})