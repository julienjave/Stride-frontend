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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Stopwatch } from './Stopwatch'

// The stopwatch for exercises with no prescribed duration — with a fake clock
// (`performance` included), as the hold timer's tests.

function setup() {
  const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) })
  render(<Stopwatch />)
  return { user }
}

function wait(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

const clock = () => screen.getByRole('timer', { name: 'Stopwatch' })
const button = (name: string) => screen.getByRole('button', { name })

beforeEach(() => {
  // `shouldAdvanceTime`: the fake clock ALSO follows real time, so
  // user-event's own little waits finish (the project's recipe for page
  // tests). The few real milliseconds a test takes stay far below a second.
  vi.useFakeTimers({
    shouldAdvanceTime: true,
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'],
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Stopwatch', () => {
  it('says why it is there, and starts at 0:00 with no Reset', () => {
    setup()
    expect(
      screen.getByText('No time is set for this exercise. Time yourself if it helps.'),
    ).toBeInTheDocument()
    expect(clock()).toHaveTextContent('0:00')
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/^$/)
  })

  it('counts up from Start, rounding down; Pause keeps the time', async () => {
    const { user } = setup()
    await user.click(button('Start'))
    expect(screen.getByRole('status')).toHaveTextContent('Stopwatch running.')
    wait(64_900)
    expect(clock()).toHaveTextContent('1:04')
    expect(clock()).toHaveTextContent('1 minute 4 seconds')
    // No Reset while it runs: a mis-tap mustn't wipe a long count.
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument()

    await user.click(button('Pause'))
    expect(screen.getByRole('status')).toHaveTextContent('Stopwatch paused.')
    wait(30_000)
    expect(clock()).toHaveTextContent('1:04')

    await user.click(button('Resume'))
    // The clock is redrawn on each tick (every 250 ms from Resume): 1.3 s
    // later the last tick was at +1.25 s — 66.15 s in all.
    wait(1_300)
    expect(clock()).toHaveTextContent('1:06')
  })

  it('Reset clears the time and gives focus to Start', async () => {
    const { user } = setup()
    await user.click(button('Start'))
    wait(5_000)
    await user.click(button('Pause'))
    await user.click(button('Reset'))
    expect(clock()).toHaveTextContent('0:00')
    expect(button('Start')).toHaveFocus()
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument()
  })
})