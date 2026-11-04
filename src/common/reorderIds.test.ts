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
import { computeReorderedIds } from './reorderIds'

const rows = [{ id: 1 }, { id: 2 }, { id: 3 }]

describe('computeReorderedIds', () => {
  it('moves the active row to the position of the over row', () => {
    expect(computeReorderedIds(rows, 1, 3)).toStrictEqual([2, 3, 1])
  })

  it('moves a row earlier just as correctly as later', () => {
    expect(computeReorderedIds(rows, 3, 1)).toStrictEqual([3, 1, 2])
  })

  it('returns null when dropped back on its own original position', () => {
    expect(computeReorderedIds(rows, 2, 2)).toBeNull()
  })

  it('returns null defensively if either id is not in the current list', () => {
    expect(computeReorderedIds(rows, 999, 2)).toBeNull()
    expect(computeReorderedIds(rows, 1, 999)).toBeNull()
  })

  // A guard for the future: the list is cached data. (Today arrayMove's own
  // copy is what keeps it untouched.)
  it("leaves the list it was given untouched (it's cached data)", () => {
    const given = [{ id: 1 }, { id: 2 }]
    computeReorderedIds(given, 1, 2)
    expect(given).toStrictEqual([{ id: 1 }, { id: 2 }])
  })
})