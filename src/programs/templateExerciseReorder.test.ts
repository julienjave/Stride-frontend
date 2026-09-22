import { describe, it, expect } from 'vitest'
import { computeReorderedTemplateExerciseIds } from './templateExerciseReorder'
import type { TemplateExercise } from './types'

function row(id: number): TemplateExercise {
  return {
    id,
    templateId: 1,
    exerciseId: id + 100,
    sets: null,
    reps: null,
    durationInSeconds: null,
    sortOrder: id,
    notes: null,
    exercise: null,
  }
}

const rows = [row(1), row(2), row(3)]

describe('computeReorderedTemplateExerciseIds', () => {
  it('moves the active row to the position of the over row', () => {
    expect(computeReorderedTemplateExerciseIds(rows, 1, 3)).toEqual([2, 3, 1])
  })

  it('moves a row earlier just as correctly as later', () => {
    expect(computeReorderedTemplateExerciseIds(rows, 3, 1)).toEqual([3, 1, 2])
  })

  it('returns null when dropped back on its own original position', () => {
    expect(computeReorderedTemplateExerciseIds(rows, 2, 2)).toBeNull()
  })

  it('returns null defensively if either id is not in the current list', () => {
    expect(computeReorderedTemplateExerciseIds(rows, 999, 2)).toBeNull()
    expect(computeReorderedTemplateExerciseIds(rows, 1, 999)).toBeNull()
  })
})