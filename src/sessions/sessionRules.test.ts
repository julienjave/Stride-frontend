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
  applyExerciseChanges,
  firstToDoIndex,
  isRunnable,
  noteToSend,
  photosFor,
  previousValues,
} from './sessionRules'
import { KNEE, TODAY, programExercise, session, sessionExercise } from './testData'

describe('isRunnable', () => {
  it('is true for an open session of today', () => {
    expect(isRunnable({ status: 'in_progress', localDate: TODAY }, TODAY)).toBe(true)
  })

  it.each(['completed', 'incomplete', 'skipped'] as const)('is false once %s (final)', (status) => {
    expect(isRunnable({ status, localDate: TODAY }, TODAY)).toBe(false)
  })

  // Open, but from an earlier day: it can't be finished any more.
  it('is false for a session left open on an earlier day', () => {
    expect(isRunnable({ status: 'in_progress', localDate: '2031-06-11' }, TODAY)).toBe(false)
  })
})

describe('firstToDoIndex', () => {
  it('opens on the first exercise not done yet', () => {
    expect(firstToDoIndex([{ completed: true }, { completed: true }, { completed: false }])).toBe(2)
  })

  it('opens on the first one when all are done — or none', () => {
    expect(firstToDoIndex([{ completed: true }, { completed: true }])).toBe(0)
    expect(firstToDoIndex([{ completed: false }, { completed: false }])).toBe(0)
  })
})

describe('applyExerciseChanges', () => {
  it('changes only that row, only those fields — in a new session, the old one untouched', () => {
    const before = session()
    const after = applyExerciseChanges(before, 2, { completed: true, difficultyRating: 6 })
    expect(after.exercises[1]).toMatchObject({ id: 2, completed: true, difficultyRating: 6, feedback: null })
    expect(after.exercises[0]).toBe(before.exercises[0])
    expect(after).not.toBe(before)
    expect(before.exercises[1].completed).toBe(false)
  })
})

describe('previousValues', () => {
  it("gives back the changed fields' current values only", () => {
    const current = session({
      exercises: [sessionExercise(1, 0, { completed: true, difficultyRating: 4, feedback: 'ok' })],
    })
    expect(previousValues(current, 1, { completed: false })).toStrictEqual({ completed: true })
    expect(previousValues(current, 1, { difficultyRating: null, feedback: 'new' })).toStrictEqual({
      difficultyRating: 4,
      feedback: 'ok',
    })
  })

  it('gives nothing for a row the session lacks', () => {
    expect(previousValues(session(), 99, { completed: true })).toStrictEqual({})
  })
})

describe('photosFor', () => {
  const program = {
    ...KNEE,
    exercises: [programExercise(1, 57, 0, { images: [{ url: 'https://s/heel.jpg' }] })],
    retiredExercises: [programExercise(7, 57, 1, { images: [{ url: 'https://s/old.jpg' }] })],
  }

  it("finds the program exercise's photos — active or retired", () => {
    expect(photosFor(program, 1)).toStrictEqual([{ url: 'https://s/heel.jpg' }])
    expect(photosFor(program, 7)).toStrictEqual([{ url: 'https://s/old.jpg' }])
  })

  it('gives none for an unknown exercise, or while the program is unknown', () => {
    expect(photosFor(program, 99)).toStrictEqual([])
    expect(photosFor(undefined, 1)).toStrictEqual([])
  })
})

describe('noteToSend', () => {
  it('trims what is written', () => {
    expect(noteToSend('  felt easy \n')).toBe('felt easy')
  })

  it('sends nothing written as no note (null) — never a blank', () => {
    expect(noteToSend('')).toBeNull()
    expect(noteToSend('  \t\n ')).toBeNull()
  })
})