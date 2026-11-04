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
import type { Active, Over } from '@dnd-kit/core'
import { sortableAnnouncements } from './sortableAnnouncements'

// dnd-kit hands the callbacks its own `Active` / `Over` objects; only the
// id is read, so the rest is left out and the object cast.
const active = (id: number) => ({ id }) as unknown as Active
const over = (id: number) => ({ id }) as unknown as Over

// Ids unlike the positions, so an id can't pass for a position.
const announce = sortableAnnouncements([
  { id: 57, name: 'A · Mobility' },
  { id: 58, name: 'B · Strength' },
  { id: 59, name: 'C' },
])

describe('sortableAnnouncements', () => {
  it('names the item and its position when it is picked up', () => {
    expect(announce.onDragStart({ active: active(58) })).toBe(
      'Picked up B · Strength, position 2 of 3.',
    )
  })

  it('says the position it would land in while moving — the slot it is over', () => {
    expect(announce.onDragOver({ active: active(58), over: over(57) })).toBe(
      'B · Strength moved to position 1 of 3.',
    )
    // Over its own slot (at pick-up, or moved back): it hasn't moved.
    expect(announce.onDragOver({ active: active(58), over: over(58) })).toBe(
      'B · Strength is at position 2 of 3.',
    )
    expect(announce.onDragOver({ active: active(58), over: null })).toBe(
      'B · Strength is not over the list.',
    )
  })

  it('says where it was dropped, or that nothing changed', () => {
    expect(announce.onDragEnd({ active: active(57), over: over(59) })).toBe(
      'A · Mobility was dropped at position 3 of 3.',
    )
    expect(announce.onDragEnd({ active: active(57), over: null })).toBe(
      "A · Mobility was dropped. Its place didn't change.",
    )
  })

  it('says a cancelled move left it where it was', () => {
    expect(announce.onDragCancel({ active: active(59), over: over(57) })).toBe(
      'Moving C was cancelled. It stays at position 3 of 3.',
    )
  })
})