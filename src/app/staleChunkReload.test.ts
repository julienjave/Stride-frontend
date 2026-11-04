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

import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import {
  RELOAD_COOLDOWN_MS,
  RELOAD_KEY,
  installStaleChunkReload,
  mayReloadNow,
} from './staleChunkReload'

describe('mayReloadNow', () => {
  it.each([
    ['never reloaded', null, 50_000, true],
    ['reloaded just now', 50_000, 50_000, false],
    ['exactly at the end of the cooldown', 50_000, 50_000 + RELOAD_COOLDOWN_MS, false],
    ['just after it', 50_000, 50_000 + RELOAD_COOLDOWN_MS + 1, true],
  ])('%s → %s', (_label, last, now, expected) => {
    expect(mayReloadNow(last, now)).toBe(expected)
  })
})

describe('installStaleChunkReload', () => {
  // A plain EventTarget stands in for window: the listener is installed on
  // it, and the test fires the event Vite would fire.
  let target: EventTarget
  let reload: Mock<() => void>
  let clock: number

  beforeEach(() => {
    target = new EventTarget()
    reload = vi.fn<() => void>()
    clock = 1_000_000
    sessionStorage.clear()
  })
  afterEach(() => vi.restoreAllMocks())

  function install(storage: Storage | null = sessionStorage) {
    installStaleChunkReload({ target, storage, reload, now: () => clock })
  }

  // Returns whether the event was cancelled (= "handled, don't throw").
  function fireLoadError(): boolean {
    const event = new Event('vite:preloadError', { cancelable: true })
    target.dispatchEvent(event)
    return event.defaultPrevented
  }

  it('reloads on a failed page file, marks the error handled, and remembers when', () => {
    install()
    expect(fireLoadError()).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(sessionStorage.getItem(RELOAD_KEY)).toBe(String(clock))
  })

  it('does not reload again within the cooldown — the error goes on to the router', () => {
    install()
    fireLoadError()
    clock += RELOAD_COOLDOWN_MS
    expect(fireLoadError()).toBe(false)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('reloads again once the cooldown has passed', () => {
    install()
    fireLoadError()
    clock += RELOAD_COOLDOWN_MS + 1
    expect(fireLoadError()).toBe(true)
    expect(reload).toHaveBeenCalledTimes(2)
  })

  // The cooldown survives the reload because it is STORED: a fresh install
  // (= the page after reloading) reads it.
  it('reads the time stored before the reload', () => {
    sessionStorage.setItem(RELOAD_KEY, String(clock - 1))
    install()
    expect(fireLoadError()).toBe(false)
    expect(reload).not.toHaveBeenCalled()
  })

  it('treats an unreadable stored value as "never reloaded"', () => {
    sessionStorage.setItem(RELOAD_KEY, 'not a number')
    install()
    expect(fireLoadError()).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  // Without storage nothing could stop a loop (server down, every reload
  // failing again): no automatic reload at all.
  it('never reloads without storage', () => {
    install(null)
    expect(fireLoadError()).toBe(false)
    expect(reload).not.toHaveBeenCalled()
  })

  it('never reloads when the time cannot be stored', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    install()
    expect(fireLoadError()).toBe(false)
    expect(reload).not.toHaveBeenCalled()
  })

  it('reloads when reading the stored time throws (nothing stored, as far as it knows)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    install()
    expect(fireLoadError()).toBe(true)
  })
})