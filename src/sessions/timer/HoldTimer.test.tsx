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
import { HoldTimer } from './HoldTimer'
import { TIMER_SOUND_STORAGE_KEY } from './timerSound'
import type { Beeper } from './beeper'

// The hold countdown, drawn and driven like a patient would. The clock is
// FAKE — `performance` included, which is what the timer reads — so "6.5
// seconds later" is one line and the test never waits for real.

const PLANK = { holdMs: 20_000, sets: 3 }

function fakeBeeper() {
  return { unlock: vi.fn(), beep: vi.fn() } satisfies Beeper
}

function setup(plan = PLANK) {
  const beeper = fakeBeeper()
  const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) })
  const view = render(<HoldTimer plan={plan} beeper={beeper} />)
  return { beeper, user, ...view }
}

// Time passing while the patient holds. In act(): the ticks change state.
function wait(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

const clock = () => screen.getByRole('timer', { name: 'Hold timer' })
const status = () => screen.getByRole('status')
const button = (name: string) => screen.getByRole('button', { name })

beforeEach(() => {
  // `shouldAdvanceTime`: the fake clock ALSO follows real time, so
  // user-event's own little waits finish (the project's recipe for page
  // tests). The few real milliseconds a test takes stay far below a second.
  vi.useFakeTimers({
    shouldAdvanceTime: true,
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'],
  })
  localStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('HoldTimer', () => {
  it('before Start: the hold in words, the full time, and nothing announced', () => {
    setup()
    expect(screen.getByText('Hold for 20 seconds · set 1 of 3')).toBeInTheDocument()
    expect(clock()).toHaveTextContent('0:20')
    // The words a screen reader reads on the clock (not "zero twenty").
    expect(clock()).toHaveTextContent('20 seconds left')
    expect(screen.getByText('Get into position, then press Start.')).toBeInTheDocument()
    expect(button('Start')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument()
    expect(status()).toHaveTextContent(/^$/)
  })

  it('Start counts down from the moment of the tap, unlocking the sound inside it', async () => {
    const { beeper, user } = setup()
    await user.click(button('Start'))
    expect(beeper.unlock).toHaveBeenCalledTimes(1)
    expect(status()).toHaveTextContent('Set 1 of 3: hold for 20 seconds.')
    expect(button('Pause')).toHaveFocus()

    wait(6_500)
    // 13.5 s left shows as 0:14 — a countdown rounds up.
    expect(clock()).toHaveTextContent('0:14')
    expect(clock()).toHaveTextContent('14 seconds left')
    expect(screen.getByText('Holding…')).toBeInTheDocument()
  })

  it('a pause stops the clock however long it lasts; Resume counts on', async () => {
    const { user } = setup()
    await user.click(button('Start'))
    wait(6_000)
    await user.click(button('Pause'))
    expect(status()).toHaveTextContent('Hold paused.')
    wait(60_000)
    expect(clock()).toHaveTextContent('0:14')
    expect(screen.getByText('Paused.')).toBeInTheDocument()

    await user.click(button('Resume'))
    expect(status()).toHaveTextContent('Hold resumed.')
    wait(4_000)
    expect(clock()).toHaveTextContent('0:10')
  })

  it('a set over: two beeps, and the next set waits for the patient', async () => {
    const { beeper, user } = setup()
    await user.click(button('Start'))
    wait(19_000)
    expect(beeper.beep).not.toHaveBeenCalled()
    wait(1_000)

    expect(beeper.beep).toHaveBeenCalledExactlyOnceWith('set_done')
    expect(status()).toHaveTextContent("Set 1 done. Start set 2 when you're ready.")
    expect(screen.getByText('Hold for 20 seconds · set 2 of 3')).toBeInTheDocument()
    expect(clock()).toHaveTextContent('0:20')
    // No rest timer: nothing counts until Start.
    wait(30_000)
    expect(clock()).toHaveTextContent('0:20')
    expect(button('Start set 2')).toBeInTheDocument()
    // Only once, however many ticks pass.
    expect(beeper.beep).toHaveBeenCalledTimes(1)
  })

  it('the last set over: three beeps, "Start over", and Done left to the patient', async () => {
    const { beeper, user } = setup()
    for (const start of ['Start', 'Start set 2', 'Start set 3']) {
      await user.click(button(start))
      wait(20_000)
    }
    expect(beeper.beep.mock.calls).toStrictEqual([['set_done'], ['set_done'], ['all_done']])
    expect(screen.getByText('All 3 sets held')).toBeInTheDocument()
    expect(clock()).toHaveTextContent('0:00')
    expect(screen.getByText('Press Done below if you managed it.')).toBeInTheDocument()
    expect(status()).toHaveTextContent('All 3 sets held. Press Done if you managed it.')

    await user.click(button('Start over'))
    expect(button('Start')).toBeInTheDocument()
    expect(screen.getByText('Hold for 20 seconds · set 1 of 3')).toBeInTheDocument()
  })

  it('the bar shows how far through the hold, full after the last set', async () => {
    const { user, container } = setup({ holdMs: 20_000, sets: 1 })
    // The bar is drawn only (aria-hidden): found by its inline width.
    const bar = () => container.querySelector<HTMLElement>('[style]')
    expect(bar()).toHaveStyle({ width: '0%' })
    await user.click(button('Start'))
    wait(10_000)
    expect(bar()).toHaveStyle({ width: '50%' })
    wait(10_000)
    expect(bar()).toHaveStyle({ width: '100%' })
  })

  it('one hold (no sets): no set count anywhere', async () => {
    const { beeper, user } = setup({ holdMs: 30_000, sets: 1 })
    expect(screen.getByText('Hold for 30 seconds')).toBeInTheDocument()
    await user.click(button('Start'))
    expect(status()).toHaveTextContent('Hold for 30 seconds.')
    wait(30_000)
    expect(beeper.beep).toHaveBeenCalledExactlyOnceWith('all_done')
    expect(screen.getByText('Hold done')).toBeInTheDocument()
  })

  it('Reset restarts THIS set and gives focus to the main button', async () => {
    const { user } = setup()
    await user.click(button('Start'))
    wait(20_000)
    await user.click(button('Start set 2'))
    wait(5_000)
    await user.click(button('Reset'))

    expect(button('Start set 2')).toHaveFocus()
    expect(clock()).toHaveTextContent('0:20')
    expect(status()).toHaveTextContent('Set 2 of 3: hold reset.')
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument()
  })

  it('Reset is offered while paused too', async () => {
    const { user } = setup()
    await user.click(button('Start'))
    wait(3_000)
    await user.click(button('Pause'))
    await user.click(button('Reset'))
    expect(button('Start')).toHaveFocus()
    expect(clock()).toHaveTextContent('0:20')
  })

  describe('the sound switch', () => {
    const soundSwitch = () => screen.getByRole('checkbox', { name: 'Beep when a hold ends' })

    it('on by default; off = no unlock, no beep — and remembered on this device', async () => {
      const { beeper, user, unmount } = setup()
      expect(soundSwitch()).toBeChecked()
      await user.click(soundSwitch())
      expect(localStorage.getItem(TIMER_SOUND_STORAGE_KEY)).toBe('off')

      await user.click(button('Start'))
      wait(20_000)
      expect(beeper.unlock).not.toHaveBeenCalled()
      expect(beeper.beep).not.toHaveBeenCalled()
      // The screen still says it.
      expect(button('Start set 2')).toBeInTheDocument()

      unmount()
      setup()
      expect(soundSwitch()).not.toBeChecked()
    })

    it('switched back on: written, and the next hold beeps', async () => {
      localStorage.setItem(TIMER_SOUND_STORAGE_KEY, 'off')
      const { beeper, user } = setup()
      await user.click(soundSwitch())
      expect(localStorage.getItem(TIMER_SOUND_STORAGE_KEY)).toBe('on')
      await user.click(button('Start'))
      wait(20_000)
      expect(beeper.beep).toHaveBeenCalledExactlyOnceWith('set_done')
    })

    it('switching it on AFTER a hold ended does not beep for that hold', async () => {
      localStorage.setItem(TIMER_SOUND_STORAGE_KEY, 'off')
      const { beeper, user } = setup()
      await user.click(button('Start'))
      wait(20_000)
      await user.click(soundSwitch())
      expect(beeper.beep).not.toHaveBeenCalled()
    })
  })
})