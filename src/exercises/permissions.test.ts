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
import { canModifyExercise } from './permissions'
import type { ExerciseDetail } from './types'

function makeExercise(overrides: Partial<ExerciseDetail> = {}): ExerciseDetail {
  return {
    id: 1,
    externalId: null,
    name: 'Wall Slide',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: [],
    equipment: [],
    instructions: ['Step'],
    images: [],
    source: 'custom',
    createdBy: 7,
    isArchived: false,
    author: null,
    ...overrides,
  }
}

describe('canModifyExercise', () => {
  it('allows the practitioner who created the custom exercise', () => {
    expect(
      canModifyExercise(makeExercise({ createdBy: 7 }), {
        id: 7,
        activeRole: 'practitioner',
      }),
    ).toBe(true)
  })

  it('rejects a different practitioner who did not create it', () => {
    expect(
      canModifyExercise(makeExercise({ createdBy: 7 }), {
        id: 999,
        activeRole: 'practitioner',
      }),
    ).toBe(false)
  })

  it('rejects a practitioner on a shared api-sourced exercise, even with no creator at all', () => {
    expect(
      canModifyExercise(
        makeExercise({ source: 'api', createdBy: null }),
        { id: 7, activeRole: 'practitioner' },
      ),
    ).toBe(false)
  })

  it('allows an admin to modify any exercise, including one they did not create', () => {
    expect(
      canModifyExercise(makeExercise({ createdBy: 7 }), {
        id: 999,
        activeRole: 'admin',
      }),
    ).toBe(true)
  })

  it('allows an admin even on a shared api-sourced exercise', () => {
    expect(
      canModifyExercise(makeExercise({ source: 'api', createdBy: null }), {
        id: 999,
        activeRole: 'admin',
      }),
    ).toBe(true)
  })
})