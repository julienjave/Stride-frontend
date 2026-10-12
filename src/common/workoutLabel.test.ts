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