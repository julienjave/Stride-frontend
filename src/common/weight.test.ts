import { describe, it, expect } from 'vitest'
import { convertWeight, formatWeight, isWeightUnit, KG_PER_LB } from './weight'

describe('convertWeight', () => {
  it('uses the exact definition of the pound', () => {
    expect(convertWeight(1, 'lbs', 'kg')).toBe(KG_PER_LB)
    expect(KG_PER_LB).toBe(0.45359237)
  })

  it('converts both ways', () => {
    expect(convertWeight(20, 'kg', 'lbs')).toBeCloseTo(44.0925, 4)
    expect(convertWeight(45, 'lbs', 'kg')).toBeCloseTo(20.4117, 4)
  })

  it('returns the same value when the units match', () => {
    expect(convertWeight(62.5, 'kg', 'kg')).toBe(62.5)
  })

  // A round trip gets back the original: no rounding happens inside
  // the conversion itself.
  it('does not round', () => {
    expect(convertWeight(convertWeight(62.5, 'kg', 'lbs'), 'lbs', 'kg')).toBeCloseTo(62.5, 10)
  })
})

describe('formatWeight', () => {
  it('shows the stored value alone when it is already in the preferred unit', () => {
    expect(formatWeight(62.5, 'kg', 'kg')).toEqual({ display: '62.5 kg', prescribed: null })
  })

  it('converts to the preferred unit, rounded to one decimal, and keeps the prescribed value', () => {
    expect(formatWeight(20, 'kg', 'lbs')).toEqual({ display: '44.1 lbs', prescribed: '20 kg' })
    expect(formatWeight(45, 'lbs', 'kg')).toEqual({ display: '20.4 kg', prescribed: '45 lbs' })
  })

  // 2.2679... kg rounds to 2.3; and a result that rounds to a whole
  // number prints without a useless ".0".
  it('prints whole numbers without a trailing .0', () => {
    expect(formatWeight(5, 'lbs', 'kg').display).toBe('2.3 kg')
    expect(formatWeight(0, 'kg', 'lbs').display).toBe('0 lbs')
    expect(formatWeight(11.0231, 'lbs', 'kg').display).toBe('5 kg')
  })

  // The prescription is shown exactly as stored — never rounded.
  it('never rounds the prescribed value', () => {
    expect(formatWeight(1.25, 'kg', 'lbs')).toEqual({ display: '2.8 lbs', prescribed: '1.25 kg' })
  })
})

describe('isWeightUnit', () => {
  it('accepts exactly kg and lbs', () => {
    expect(isWeightUnit('kg')).toBe(true)
    expect(isWeightUnit('lbs')).toBe(true)
    expect(isWeightUnit('KG')).toBe(false)
    expect(isWeightUnit('stone')).toBe(false)
  })
})