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
import { ignoreEmptySelection } from './ignoreEmptySelection'

describe('ignoreEmptySelection', () => {
  it('passes a chosen value through', () => {
    const onChange = vi.fn()
    ignoreEmptySelection(onChange)('2')
    expect(onChange).toHaveBeenCalledWith('2')
  })

  // The two shapes Radix's echo of a reset takes.
  it('ignores an empty string and undefined', () => {
    const onChange = vi.fn()
    const handler = ignoreEmptySelection(onChange)
    handler('')
    handler(undefined)
    expect(onChange).not.toHaveBeenCalled()
  })
})