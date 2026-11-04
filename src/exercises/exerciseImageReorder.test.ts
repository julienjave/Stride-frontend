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
import { computeReorderedKeys } from './exerciseImageReorder'
import type { ExerciseImage } from './types'

function image(objectKey: string): ExerciseImage {
  return { objectKey, url: `https://example.com/${objectKey}` }
}

const images = [image('a'), image('b'), image('c')]

describe('computeReorderedKeys', () => {
  it('moves the active image to the position of the over image', () => {
    // Drag "a" (index 0) to land where "c" (index 2) currently is.
    expect(computeReorderedKeys(images, 'a', 'c')).toEqual(['b', 'c', 'a'])
  })

  it('moves an image earlier in the list just as correctly as later', () => {
    // Drag "c" (index 2) to land where "a" (index 0) currently is.
    expect(computeReorderedKeys(images, 'c', 'a')).toEqual(['c', 'a', 'b'])
  })

  it('returns null when dropped back on its own original position', () => {
    // Nothing actually changed — no reason to fire a request for it.
    expect(computeReorderedKeys(images, 'b', 'b')).toBeNull()
  })

  it('returns null defensively if either id is not in the current gallery', () => {
    expect(computeReorderedKeys(images, 'not-real', 'b')).toBeNull()
    expect(computeReorderedKeys(images, 'a', 'not-real')).toBeNull()
  })

  it('preserves every other image untouched, only moving the two involved', () => {
    const four = [image('a'), image('b'), image('c'), image('d')]
    // Moving "a" next to "c" shouldn't disturb "d"'s relative position
    // any more than the single-slot shift that necessarily causes.
    expect(computeReorderedKeys(four, 'a', 'c')).toEqual([
      'b',
      'c',
      'a',
      'd',
    ])
  })
})