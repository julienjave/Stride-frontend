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

import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  TIMER_SOUND_STORAGE_KEY,
  parseTimerSound,
  readTimerSound,
  sharedBeeper,
  writeTimerSound,
} from './timerSound'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('the timer sound preference', () => {
  it('on unless it was switched off — anything unknown is the default', () => {
    expect(parseTimerSound('off')).toBe(false)
    expect(parseTimerSound('on')).toBe(true)
    expect(parseTimerSound(null)).toBe(true)
    expect(parseTimerSound('OFF')).toBe(true)
  })

  it('written and read back under its own key', () => {
    writeTimerSound(false)
    expect(localStorage.getItem(TIMER_SOUND_STORAGE_KEY)).toBe('off')
    expect(readTimerSound()).toBe(false)
    writeTimerSound(true)
    expect(localStorage.getItem(TIMER_SOUND_STORAGE_KEY)).toBe('on')
    expect(readTimerSound()).toBe(true)
  })

  it('storage that throws: read as the default, a write quietly not remembered', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(readTimerSound()).toBe(true)
    expect(() => writeTimerSound(false)).not.toThrow()
  })

  it('one beeper for the whole app', () => {
    expect(sharedBeeper()).toBe(sharedBeeper())
  })
})