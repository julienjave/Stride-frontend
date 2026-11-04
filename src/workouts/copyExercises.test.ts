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
import {
  canAddWorkout,
  copiedNotice,
  copyRequestBody,
  copySubject,
  defaultCopyTarget,
  newWorkoutLabel,
} from './copyExercises'

// Roadmap Phase 6.5: copying several exercises, or a whole workout, at once.

describe('copyRequestBody', () => {
  it('names an existing workout by id', () => {
    expect(copyRequestBody([3, 4], { workoutId: 58 })).toStrictEqual({
      exerciseIds: [3, 4],
      targetWorkoutId: 58,
    })
  })

  it('says "a new workout" with targetWorkoutId: null, the name trimmed', () => {
    expect(copyRequestBody([3], { newWorkoutName: '  Warm-up ' })).toStrictEqual({
      exerciseIds: [3],
      targetWorkoutId: null,
      newWorkoutName: 'Warm-up',
    })
  })

  it('sends a blank or absent name as null — one spelling for "no name"', () => {
    for (const newWorkoutName of ['', '   ', null]) {
      expect(copyRequestBody([3], { newWorkoutName })).toStrictEqual({
        exerciseIds: [3],
        targetWorkoutId: null,
        newWorkoutName: null,
      })
    }
  })

  it('copies the id list rather than sharing it', () => {
    const ids = [3]
    const body = copyRequestBody(ids, { workoutId: 58 })
    body.exerciseIds.push(9)
    expect(ids).toEqual([3])
  })
})

describe('copySubject / copiedNotice', () => {
  it("names one exercise, counts several", () => {
    expect(copySubject(1, 'Squat')).toBe('Squat')
    expect(copySubject(3, 'Squat')).toBe('3 exercises')
  })

  it('says the copy, or the copies, are independent', () => {
    expect(copiedNotice(1, 'Squat', 'B')).toBe(
      "Copied Squat to B. The copy is independent: changing one won't change the other.",
    )
    expect(copiedNotice(3, '3 exercises', 'B · Strength')).toBe(
      "Copied 3 exercises to B · Strength. The copies are independent: changing one won't change its original.",
    )
  })
})

describe('newWorkoutLabel / canAddWorkout', () => {
  it('gives the new workout the next letter, with its name when it has one', () => {
    expect(newWorkoutLabel(2, null)).toBe('C')
    expect(newWorkoutLabel(2, 'Warm-up')).toBe('C · Warm-up')
  })

  it('allows a new workout up to 10 (A to J)', () => {
    expect(canAddWorkout(9)).toBe(true)
    expect(canAddWorkout(10)).toBe(false)
  })
})

describe('defaultCopyTarget', () => {
  const group = (id: number, position: number) => ({
    workout: { id },
    position,
    label: String(id),
    exercises: [],
  })
  const [a, b, c] = [group(57, 0), group(58, 1), group(59, 2)]

  it('offers the NEXT workout after the source', () => {
    expect(defaultCopyTarget(b, [a, b, c])).toBe(59)
    expect(defaultCopyTarget(a, [a, b, c])).toBe(58)
  })

  it('offers the first one when the source is the last', () => {
    expect(defaultCopyTarget(c, [a, b, c])).toBe(57)
  })

  it('offers a new workout when there is no other', () => {
    expect(defaultCopyTarget(a, [a])).toBe('new')
  })
})