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
import { addTemplateExerciseSchema } from './schemas'

// The weight half of the add-exercise schema — the backend's
// hasStartedWeight rule (weight and unit together, or neither), adapted
// to a form whose unit toggle always has a unit selected.
describe('addTemplateExerciseSchema — weight and unit', () => {
  it('keeps a weight together with its unit', () => {
    expect(addTemplateExerciseSchema.parse({ weight: 20, weightUnit: 'kg' })).toEqual({
      weight: 20,
      weightUnit: 'kg',
    })
  })

  // What every weightless exercise looks like in the form: the unit is
  // dropped from the output, not reported as an error.
  it('drops a unit that comes without a weight', () => {
    expect(addTemplateExerciseSchema.parse({ sets: 3, weightUnit: 'lbs' })).toEqual({
      sets: 3,
      weightUnit: undefined,
    })
  })

  // The form can't produce this (a unit is always pre-selected), but the
  // schema still refuses it on its own.
  it('rejects a weight without a unit', () => {
    const result = addTemplateExerciseSchema.safeParse({ weight: 20 })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]).toMatchObject({
      message: 'Select a unit for the weight',
      path: ['weightUnit'],
    })
  })
})