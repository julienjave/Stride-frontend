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

// Which tint a user's circle of initials gets (decisions §47).
//
// The three tints, each a background + text pair defined in index.css
// (`--avatar-teal` / `--avatar-teal-foreground`, …) and checked for
// contrast by src/theme/paletteContrast.test.ts.
//
// The classes are written out IN FULL, never built as `bg-avatar-${tint}`:
// Tailwind decides which classes to generate by reading the source files
// as plain text, looking for things shaped like class names. A class that
// only exists once JavaScript has run (a template string) is never seen,
// so its CSS would never be generated and the circle would stay
// transparent.
export const AVATAR_TINT_CLASSES = [
  'bg-avatar-teal text-avatar-teal-foreground',
  'bg-avatar-coral text-avatar-coral-foreground',
  'bg-avatar-sand text-avatar-sand-foreground',
] as const

// 2^32 divided by the golden ratio (≈ 1.618), rounded to an odd integer.
// The classic constant of "Fibonacci hashing" (Knuth, The Art of Computer
// Programming, vol. 3): multiplying by it scatters consecutive numbers
// across the whole 32-bit range.
const GOLDEN = 0x9e3779b1

// The SAME user always gets the SAME tint — in the top bar, the roster,
// Messages, on every device, after every reload — while different users
// look randomly spread. That's why this is a function of the user's id
// and not Math.random(): a random pick would change on every render.
//
// Why the id and not the name: a name can be edited, and the colour
// shouldn't jump when someone fixes a typo in their surname.
//
// Why not simply `userId % 3`: ids are handed out in order, so anything
// created in a regular pattern would line up on one colour (the seed or a
// clinic creating "a practitioner, then two patients" again and again
// would give every practitioner the same tint). Multiplying by GOLDEN first
// breaks such patterns.
//
// The steps:
//   1. Math.imul multiplies as 32-bit integers, wrapping around on
//      overflow like C's unsigned arithmetic would. A plain `*` would give
//      a float above 2^53 for large ids and lose the low digits.
//   2. `>>> 0` reads the result as UNSIGNED (0 … 2^32 - 1): imul returns a
//      signed number, sometimes negative.
//   3. Dividing by 2^32 gives a fraction in [0, 1); times the number of
//      tints, rounded down, picks one. Consecutive ids step by about 0.618
//      of the range each time, a sequence known to spread evenly (each
//      new point lands in the largest gap left so far): ids 1 to 300 fall
//      exactly 100 / 100 / 100.
//
// A trap avoided (found while building this): taking the high 16 bits and
// then `% 3` looks equivalent but isn't. Each consecutive id adds about
// 40,503 to those bits, and 40,503 is a multiple of 3, so the remainder
// barely changes and long runs of one colour appear. Scaling the fraction
// uses all the bits instead of a remainder.
export function avatarTintIndex(userId: number): number {
  const hash = Math.imul(userId, GOLDEN) >>> 0
  return Math.floor((hash / 2 ** 32) * AVATAR_TINT_CLASSES.length)
}

export function avatarTintClass(userId: number): string {
  return AVATAR_TINT_CLASSES[avatarTintIndex(userId)]
}
