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

import { describe, it, expect } from 'vitest'
import indexCss from '../index.css?raw'
import { AVATAR_TINT_CLASSES, avatarTintClass, avatarTintIndex } from './avatarTint'

describe('avatarTintIndex', () => {
  // The whole point: a pure function of the id, so the same person is the
  // same colour on every screen and every reload.
  it('gives the same id the same tint every time', () => {
    for (const id of [1, 42, 9_999, 2_147_483_647]) {
      expect(avatarTintIndex(id)).toBe(avatarTintIndex(id))
    }
  })

  it('always answers a valid tint, even for large ids', () => {
    for (const id of [0, 1, 2, 3, 1_000_000, 2_147_483_647, Number.MAX_SAFE_INTEGER]) {
      const index = avatarTintIndex(id)
      expect(Number.isInteger(index)).toBe(true)
      expect(index).toBeGreaterThanOrEqual(0)
      expect(index).toBeLessThan(AVATAR_TINT_CLASSES.length)
    }
  })

  // Exactly even over ids 1–300 (the golden-ratio sequence's property).
  it('spreads consecutive ids evenly across the three tints', () => {
    const counts = [0, 0, 0]
    for (let id = 1; id <= 300; id++) counts[avatarTintIndex(id)]++
    expect(counts).toEqual([100, 100, 100])
  })

  // Neighbours differ: three users created one after the other get three
  // colours (what a fresh clinic's first patients look like on the roster).
  it('gives ids 1, 2 and 3 three different tints', () => {
    expect(new Set([1, 2, 3].map(avatarTintIndex)).size).toBe(3)
  })

  // What `userId % 3` gets wrong: users created in a regular pattern (every
  // third id) would all share one colour. Each stride below still reaches
  // every tint, each at least a quarter of the time.
  it.each([2, 3, 4, 6])('still spreads ids taken every %i', (step) => {
    const counts = [0, 0, 0]
    let total = 0
    for (let id = 1; id <= 600; id += step) {
      counts[avatarTintIndex(id)]++
      total++
    }
    for (const count of counts) expect(count).toBeGreaterThanOrEqual(total / 4)
  })
})

describe('AVATAR_TINT_CLASSES', () => {
  it('answers the class pair of the picked tint', () => {
    expect(avatarTintClass(1)).toBe(AVATAR_TINT_CLASSES[avatarTintIndex(1)])
  })

  // A class names a token Tailwind maps in index.css's `@theme inline`
  // (`--color-avatar-teal: var(--avatar-teal)`): a typo here would draw
  // a transparent circle with no error anywhere.
  it('names only colours index.css defines', () => {
    for (const classes of AVATAR_TINT_CLASSES) {
      for (const name of classes.split(' ')) {
        const token = name.replace(/^(bg|text)-/, '')
        expect(indexCss, name).toContain(`--color-${token}: var(--${token});`)
      }
    }
  })
})
