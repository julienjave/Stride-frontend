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
  clampToGamut,
  contrastRatio,
  isInGamut,
  oklchToSrgb,
  over,
  parseColor,
  relativeLuminance,
} from './colorContrast'

// Reference values come from outside this code: WCAG's own definitions
// (black on white is exactly 21:1) and published conversions (CSS Color 4's
// examples, and the logo's hex colours converted by an independent script).

const WHITE = { r: 1, g: 1, b: 1 }
const BLACK = { r: 0, g: 0, b: 0 }

function toHex({ r, g, b }: { r: number; g: number; b: number }) {
  return (
    '#' +
    [r, g, b].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')
  )
}

describe('parseColor', () => {
  it('reads #rrggbb, either case', () => {
    expect(parseColor('#FF8000')).toEqual({ r: 1, g: 128 / 255, b: 0, alpha: 1 })
    expect(parseColor(' #ff8000 ')).toEqual({ r: 1, g: 128 / 255, b: 0, alpha: 1 })
  })

  it('reads oklch() — white, black, and the logo teal and coral', () => {
    expect(toHex(parseColor('oklch(1 0 0)'))).toBe('#ffffff')
    expect(toHex(parseColor('oklch(0 0 0)'))).toBe('#000000')
    // The logo's colours: #2F7A78 is oklch(0.533 0.073 192.736), #E07856 is
    // oklch(0.683 0.138 38.744) — converted the other way, independently.
    expect(toHex(parseColor('oklch(0.533 0.073 192.736)'))).toBe('#2f7a78')
    expect(toHex(parseColor('oklch(0.683 0.138 38.744)'))).toBe('#e07856')
  })

  it('reads an opacity as a fraction or a percentage', () => {
    expect(parseColor('oklch(1 0 0 / 10%)').alpha).toBeCloseTo(0.1)
    expect(parseColor('oklch(1 0 0 / 0.15)').alpha).toBeCloseTo(0.15)
    expect(parseColor('oklch(1 0 0)').alpha).toBe(1)
  })

  it('refuses a notation it cannot read, rather than skipping it', () => {
    expect(() => parseColor('rgb(0 0 0)')).toThrow('Unsupported colour notation')
    expect(() => parseColor('#fff')).toThrow('Unsupported colour notation')
    expect(() => parseColor('var(--primary)')).toThrow('Unsupported colour notation')
  })
})

describe('gamut', () => {
  it('knows a colour a screen can show from one it cannot', () => {
    expect(isInGamut(oklchToSrgb(0.515, 0.073, 193))).toBe(true)
    // A vivid green far outside sRGB.
    const tooVivid = oklchToSrgb(0.7, 0.4, 145)
    expect(isInGamut(tooVivid)).toBe(false)
    const clamped = clampToGamut({ ...tooVivid, alpha: 1 })
    for (const v of [clamped.r, clamped.g, clamped.b]) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })

  it('allows the small tolerance, and no more', () => {
    expect(isInGamut({ r: -0.009, g: 0.5, b: 1.009 })).toBe(true)
    expect(isInGamut({ r: -0.011, g: 0.5, b: 0.5 })).toBe(false)
    expect(isInGamut({ r: 0.5, g: 1.011, b: 0.5 })).toBe(false)
  })
})

describe('over', () => {
  it('blends a translucent colour onto what is behind it', () => {
    expect(over({ ...WHITE, alpha: 0.5 }, BLACK)).toEqual({ r: 0.5, g: 0.5, b: 0.5 })
    expect(over({ ...WHITE, alpha: 1 }, BLACK)).toEqual(WHITE)
    expect(over({ ...WHITE, alpha: 0 }, BLACK)).toEqual(BLACK)
    expect(over({ r: 1, g: 0, b: 0, alpha: 0.25 }, { r: 0, g: 0, b: 1 })).toEqual({
      r: 0.25,
      g: 0,
      b: 0.75,
    })
  })
})

describe('relativeLuminance and contrastRatio', () => {
  it('gives WCAG’s end points', () => {
    expect(relativeLuminance(BLACK)).toBe(0)
    expect(relativeLuminance(WHITE)).toBeCloseTo(1, 10)
    expect(contrastRatio(BLACK, WHITE)).toBeCloseTo(21, 10)
    expect(contrastRatio(WHITE, WHITE)).toBe(1)
  })

  it('is the same whichever colour comes first', () => {
    const teal = parseColor('#2f7a78')
    expect(contrastRatio(teal, WHITE)).toBe(contrastRatio(WHITE, teal))
  })

  it('weights green most and blue least, as the eye does', () => {
    expect(relativeLuminance({ r: 0, g: 1, b: 0 })).toBeCloseTo(0.7152, 4)
    expect(relativeLuminance({ r: 1, g: 0, b: 0 })).toBeCloseTo(0.2126, 4)
    expect(relativeLuminance({ r: 0, g: 0, b: 1 })).toBeCloseTo(0.0722, 4)
  })

  it('decodes the gamma curve on both of its segments', () => {
    // #808080: the power segment — 0.2159 of white's light, not 0.5.
    expect(relativeLuminance(parseColor('#808080'))).toBeCloseTo(0.2159, 4)
    // #0a0a0a (10/255 = 0.039): the straight segment near black.
    expect(relativeLuminance(parseColor('#0a0a0a'))).toBeCloseTo(10 / 255 / 12.92, 6)
  })

  it('matches published ratios', () => {
    // The logo teal with white text (checked by hand in the discussion).
    expect(contrastRatio(parseColor('#2f7a78'), WHITE)).toBeCloseTo(5.03, 2)
    // The logo coral with white text: why it can't carry text.
    expect(contrastRatio(parseColor('#e07856'), WHITE)).toBeCloseTo(3.0, 1)
    // #767676 on white is the classic "just passes AA" grey: 4.54.
    expect(contrastRatio(parseColor('#767676'), WHITE)).toBeCloseTo(4.54, 2)
  })
})