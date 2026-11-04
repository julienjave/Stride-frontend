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
import { forgetRetry, isFailedRetry, rememberRetry, retryAnswered, takeWorkedRetry } from './retryMemory'

// The memory itself, with a pinned clock — the component tests
// (LoadError.test.tsx, useRetryFocus.test.tsx) read the real one, a moment
// after the press, so they can't see its exact edges.

const T = Date.UTC(2031, 5, 5, 12, 0, 0)

function at(ms: number) {
  vi.spyOn(Date, 'now').mockReturnValue(ms)
}

afterEach(() => {
  vi.restoreAllMocks()
  // Each test starts with nothing remembered.
  forgetRetry('a')
  forgetRetry('b')
})

describe('retryMemory', () => {
  it('remembers a press for 30 seconds — not one millisecond more', () => {
    at(T)
    rememberRetry('a')
    at(T + 29_999)
    expect(isFailedRetry('a')).toBe(true)
    at(T + 30_000)
    expect(isFailedRetry('a')).toBe(false)
    expect(takeWorkedRetry('a')).toBe(false)
  })

  // Two blocks on one page pressed one after the other (two sections that
  // both failed): the FIRST one's late answer must not wipe the SECOND
  // press — only the press it answers.
  it("an older press's answer leaves a newer press alone", () => {
    at(T)
    const first = rememberRetry('a')
    rememberRetry('b')
    // The first block failed again in place: it would forget ITS press…
    retryAnswered(first, false, true)
    // …but the memory now holds the second one, untouched.
    expect(isFailedRetry('b')).toBe(true)
    // Nor does a late "worked" mark the newer press as worked.
    retryAnswered(first, true, false)
    expect(isFailedRetry('b')).toBe(true)
  })

  it('a press already taken: its answer changes nothing', () => {
    at(T)
    const press = rememberRetry('a')
    expect(takeWorkedRetry('a')).toBe(true)
    retryAnswered(press, false, false)
    expect(isFailedRetry('a')).toBe(false)
    expect(takeWorkedRetry('a')).toBe(false)
  })
})