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
import { workoutLabel, workoutLetter } from './workoutLabel'

describe('workoutLetter', () => {
  it('turns a position into a letter, A for the first', () => {
    expect(workoutLetter(0)).toBe('A')
    expect(workoutLetter(1)).toBe('B')
    // The backend's limit: 10 workouts, A–J.
    expect(workoutLetter(9)).toBe('J')
  })
})

describe('workoutLabel', () => {
  it('adds the name after the letter when there is one', () => {
    expect(workoutLabel(0, 'Mobility')).toBe('A · Mobility')
    expect(workoutLabel(1, '  Strength ')).toBe('B · Strength')
  })

  it('is the letter alone for an unnamed workout — null or blank', () => {
    expect(workoutLabel(0, null)).toBe('A')
    expect(workoutLabel(2, '   ')).toBe('C')
  })
})