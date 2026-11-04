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
import { localPath, pickerReturnHref } from './pickerReturnHref'

describe('pickerReturnHref', () => {
  it('adds the exercise with "?" to a path without a query', () => {
    expect(pickerReturnHref('/practitioner/programs/templates/1/exercises/new', 5)).toBe(
      '/practitioner/programs/templates/1/exercises/new?exerciseId=5',
    )
  })

  it('adds it with "&" when the path already has a query — never a second "?"', () => {
    expect(
      pickerReturnHref('/practitioner/programs/templates/1/exercises/new?workoutId=58', 5),
    ).toBe('/practitioner/programs/templates/1/exercises/new?workoutId=58&exerciseId=5')
  })

  it('replaces an exercise already there instead of adding a second one', () => {
    expect(pickerReturnHref('/x?exerciseId=3&workoutId=58', 5)).toBe(
      '/x?exerciseId=5&workoutId=58',
    )
  })

  it('keeps a fragment, after the query', () => {
    expect(pickerReturnHref('/x?workoutId=58#exercises', 5)).toBe(
      '/x?workoutId=58&exerciseId=5#exercises',
    )
  })

  it('keeps only the path when given another site (no open redirect)', () => {
    expect(pickerReturnHref('https://elsewhere.example/login', 5)).toBe(
      '/login?exerciseId=5',
    )
    expect(pickerReturnHref('//elsewhere.example/login', 5)).toBe('/login?exerciseId=5')
  })
})

describe('localPath', () => {
  it('keeps a path on this site as it is', () => {
    expect(localPath('/practitioner/programs/templates/1/exercises/new?workoutId=58')).toBe(
      '/practitioner/programs/templates/1/exercises/new?workoutId=58',
    )
  })

  it('drops another site', () => {
    expect(localPath('https://elsewhere.example/login?next=1')).toBe('/login?next=1')
  })
})