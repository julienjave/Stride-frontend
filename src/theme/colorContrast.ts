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

// Colour maths for checking the theme's contrast (design decisions §39).
//
// WHY THIS EXISTS: the palette lives in index.css as CSS custom properties,
// and nothing stops a later tweak ("a slightly lighter teal") from quietly
// pushing text below WCAG's 4.5:1. paletteContrast.test.ts reads the real
// stylesheet and checks every pair the screens use, with the functions
// below. No library: the maths is short, well defined, and worth seeing.
//
// THE PIPELINE, from what the stylesheet says to a contrast ratio:
//
//   "oklch(0.515 0.073 193)"  ──parseColor──▶  sRGB (0–1 per channel)
//   "#e07856"                  ──parseColor──▶  sRGB
//   (a translucent colour is first laid OVER what's behind it: `over`)
//   sRGB ──relativeLuminance──▶ Y (0 = black, 1 = white)
//   two Ys ──contrastRatio──▶ (Ylighter + 0.05) / (Ydarker + 0.05), 1 to 21

// A colour as the screen paints it: red, green, blue between 0 and 1, in
// sRGB's usual (gamma-encoded) form — "#ff8000" is { r: 1, g: 0.502, b: 0 }.
export interface Rgb {
  r: number
  g: number
  b: number
}

// The same, plus opacity: 1 = solid, 0 = invisible. Borders like
// `oklch(1 0 0 / 10%)` are translucent.
export interface Rgba extends Rgb {
  alpha: number
}

// How far outside sRGB a colour may compute before we call it out of gamut —
// room for the 3-decimal rounding of the values in index.css, nothing more.
// A colour outside sRGB can't be shown on an ordinary screen; the browser
// pulls it back in, so its painted value — and its contrast — would differ
// from what we compute. (shadcn's red, `--destructive`, is one: Tailwind's
// red-600, chosen for wide-gamut screens, computes to a green of −0.096.)
export const GAMUT_TOLERANCE = 0.01

// Reads the two colour notations index.css uses:
//   - `#rrggbb` (the chart colours), and
//   - `oklch(L C H)` / `oklch(L C H / A)` with A as `0.1` or `10%`.
// Anything else throws, so a new notation added to the stylesheet fails the
// test loudly instead of being skipped.
export function parseColor(text: string): Rgba {
  const value = text.trim()

  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value)
  if (hex) {
    return {
      r: parseInt(hex[1], 16) / 255,
      g: parseInt(hex[2], 16) / 255,
      b: parseInt(hex[3], 16) / 255,
      alpha: 1,
    }
  }

  const oklch =
    /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+)(%?)\s*)?\)$/i.exec(value)
  if (oklch) {
    const [, l, c, h, a, percent] = oklch
    const alpha = a === undefined ? 1 : percent ? Number(a) / 100 : Number(a)
    return { ...oklchToSrgb(Number(l), Number(c), Number(h)), alpha }
  }

  throw new Error(`Unsupported colour notation: "${text}"`)
}

// OKLCH → sRGB, following the CSS Color 4 definition (Björn Ottosson's
// OKLab matrices).
//
// THE CONCEPT: OKLCH describes a colour the way people judge it —
//   L  lightness, 0 (black) to 1 (white), spaced so equal steps LOOK equal;
//   C  chroma, how colourful (0 = a grey);
//   H  hue, an angle (≈ 40 coral, ≈ 193 teal, ≈ 85 the warm greys).
// That is why the palette is written in it: "the same teal, a bit darker"
// is one number changed (L), and a "warm grey" is simply a tiny chroma at
// a warm hue. Screens, though, work in sRGB, so to measure contrast we
// convert: OKLCH → OKLab (polar to x/y) → LMS cone responses (cubed) →
// linear sRGB (a matrix) → gamma-encoded sRGB (the curve below).
//
// Returns UNCLAMPED values, so `isInGamut` can tell when a colour falls
// outside what a screen can show; `clampToGamut` pulls it back in.
export function oklchToSrgb(lightness: number, chroma: number, hueDegrees: number): Rgb {
  const hue = (hueDegrees * Math.PI) / 180
  const a = chroma * Math.cos(hue)
  const b = chroma * Math.sin(hue)

  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3

  return {
    r: encodeGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: encodeGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: encodeGamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  }
}

export function isInGamut(color: Rgb, tolerance = GAMUT_TOLERANCE): boolean {
  return [color.r, color.g, color.b].every((v) => v >= -tolerance && v <= 1 + tolerance)
}

export function clampToGamut(color: Rgba): Rgba {
  const clamp = (v: number) => Math.min(1, Math.max(0, v))
  return { r: clamp(color.r), g: clamp(color.g), b: clamp(color.b), alpha: color.alpha }
}

// A translucent colour drawn on top of a solid one — what the screen ends
// up showing. Browsers blend in gamma-encoded sRGB by default, so we do too:
// each channel is `top × alpha + bottom × (1 − alpha)`.
// Used for Tailwind's `/10`-style opacities (`bg-primary/10`) and the
// dark theme's `oklch(1 0 0 / 10%)` borders.
export function over(top: Rgba, bottom: Rgb): Rgb {
  const mix = (t: number, b: number) => t * top.alpha + b * (1 - top.alpha)
  return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b) }
}

// WCAG's relative luminance: how much light a colour sends to the eye,
// 0 for black to 1 for white. The channels are first DECODED back to linear
// light (screens store them gamma-encoded), then weighted by how sensitive
// the eye is to each — green most, blue least.
export function relativeLuminance(color: Rgb): number {
  return (
    0.2126 * decodeGamma(color.r) +
    0.7152 * decodeGamma(color.g) +
    0.0722 * decodeGamma(color.b)
  )
}

// WCAG's contrast ratio, the same whichever colour comes first:
// 1 (identical) to 21 (black on white). WCAG AA asks 4.5 for ordinary text
// and 3 for large text and for the parts of a control you must see (a
// border, a focus outline, a state marker).
export function contrastRatio(first: Rgb, second: Rgb): number {
  const a = relativeLuminance(first)
  const b = relativeLuminance(second)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

// sRGB's transfer curve, both ways: a short straight segment near black,
// then a power curve. "Encoded" is what's stored (#80 = 0.502); "linear" is
// proportional to light (0.502 encoded is only about 0.216 of white's light).
function encodeGamma(linear: number): number {
  const sign = Math.sign(linear)
  const x = Math.abs(linear)
  return sign * (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055)
}

function decodeGamma(encoded: number): number {
  return encoded <= 0.04045 ? encoded / 12.92 : ((encoded + 0.055) / 1.055) ** 2.4
}