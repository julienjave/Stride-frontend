// Weight units and conversion — pure functions, no React, so they're
// trivial to test and usable from any component.
//
// The one rule behind everything here (design decisions §1): a STORED
// weight is never converted. A practitioner prescribes "20 kg" and 20 kg
// is what the database keeps, forever. Conversion only happens on screen,
// for a viewer whose preferred unit is the other one — and even then the
// prescribed value is shown next to the converted one.

// The same two units as the backend's WEIGHT_UNITS (weight-unit.schema.ts).
// `as const` keeps the exact strings, so WeightUnit below is 'kg' | 'lbs'
// rather than just `string`.
export const WEIGHT_UNITS = ['kg', 'lbs'] as const
export type WeightUnit = (typeof WEIGHT_UNITS)[number]

// Exact, not an approximation: since 1959 the international pound is
// DEFINED as 0.45359237 kg. Using 2.2 (or even 2.2046) would put every
// converted value slightly off, and the error grows with the weight.
export const KG_PER_LB = 0.45359237

// A type guard: `value is WeightUnit` tells TypeScript that when this
// returns true, `value` can be treated as a WeightUnit from then on — a
// checked narrowing, instead of an unchecked `value as WeightUnit` cast
// that would happily accept 'stone'. Used where a library hands us a plain
// string (the Settings menu's radio group).
export function isWeightUnit(value: string): value is WeightUnit {
  return (WEIGHT_UNITS as readonly string[]).includes(value)
}

// Full precision — no rounding here. Rounding is a DISPLAY decision, made
// once, at the very end (roundForDisplay below); rounding in the middle of
// a calculation would let errors pile up.
export function convertWeight(weight: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return weight
  return from === 'kg' ? weight / KG_PER_LB : weight * KG_PER_LB
}

// One decimal place: 20 kg → 44.1 lbs. Precise enough to be useful,
// without pretending to a precision no gym scale has (44.0925 lbs).
// Deliberately NOT rounded to plate increments (2.5 kg / 5 lbs): that
// would change the prescription, and what's available depends on the gym.
//
// Math.round(x * 10) / 10 rounds to one decimal and gives back a NUMBER,
// so printing it drops a useless ".0" by itself: 44 prints as "44", not
// "44.0" — unlike toFixed(1), which returns the string "44.0".
function roundForDisplay(value: number): number {
  return Math.round(value * 10) / 10
}

export interface FormattedWeight {
  // What to show first, in the viewer's preferred unit: "44.1 lbs".
  display: string
  // The weight exactly as prescribed — "20 kg" — ONLY when `display` is a
  // converted value; null when the two units already match, since
  // "20 kg (20 kg)" would say nothing.
  prescribed: string | null
}

// The one function every weight display goes through. The prescribed
// value is printed as stored (no rounding): it IS the prescription.
export function formatWeight(
  weight: number,
  unit: WeightUnit,
  preferredUnit: WeightUnit,
): FormattedWeight {
  const prescribed = `${weight} ${unit}`
  if (unit === preferredUnit) {
    return { display: prescribed, prescribed: null }
  }
  const converted = roundForDisplay(convertWeight(weight, unit, preferredUnit))
  return { display: `${converted} ${preferredUnit}`, prescribed }
}