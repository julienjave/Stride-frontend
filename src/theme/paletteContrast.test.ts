import { describe, it, expect } from 'vitest'
// The REAL stylesheet, as text (`?raw`, as themeScript.test.ts reads
// index.html): the test checks the colours the app actually ships, not a
// copy that could drift. For a .css file this needs vite.config.ts's
// `test.css.include` — without it Vitest hands back an empty string.
import indexCss from '../index.css?raw'
import {
  clampToGamut,
  contrastRatio,
  isInGamut,
  over,
  parseColor,
  relativeLuminance,
  type Rgb,
  type Rgba,
} from './colorContrast'

// Design decisions §39: every colour pair the screens put together is held
// to WCAG AA, in BOTH themes —
//   TEXT  4.5:1 (ordinary text; WCAG 1.4.3),
//   MARK  3:1   (what you must see to use a control: a focused field's
//                border, the active section's line; WCAG 1.4.11).

const TEXT = 4.5
const MARK = 3

type Tokens = Record<string, string>

// Collects the `--name: value;` lines of one rule (`:root {…}` or
// `.dark {…}`). The rules hold no nested braces, so "up to the first `}`"
// is the whole block.
function tokensOf(selector: string): Tokens {
  const start = indexCss.indexOf(`${selector} {`)
  if (start === -1) throw new Error(`index.css has no "${selector} {" rule`)
  const block = indexCss.slice(start, indexCss.indexOf('}', start))
  const tokens: Tokens = {}
  // Comments are removed first, so a comment quoting an old declaration
  // ("was --primary: …;") can never be read as one. (Today's comments hold
  // none — removing this line changes no result — but the next one might.)
  for (const [, name, value] of block
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) {
    tokens[name] = value.trim()
  }
  return tokens
}

const light = tokensOf(':root')
// `.dark` only overrides: a token it doesn't set keeps its :root value,
// exactly as the cascade does in the browser.
const dark = { ...light, ...tokensOf('.dark') }

const THEMES = [
  ['light', light],
  ['dark', dark],
] as const

// The tokens this palette defines (the shadcn chart / sidebar sets are
// unused by the app and left as shadcn wrote them).
const PALETTE = [
  'background',
  'foreground',
  'card',
  'popover',
  'primary',
  'primary-foreground',
  'primary-hover',
  'secondary',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'ring',
  'brand-accent',
]

function color(tokens: Tokens, name: string): Rgba {
  const value = tokens[name]
  if (value === undefined) throw new Error(`No --${name} token`)
  return clampToGamut(parseColor(value))
}

// A token as painted on a SOLID surface: translucent ones laid over it.
function onSurface(tokens: Tokens, name: string, surface: Rgb): Rgb {
  return over(color(tokens, name), surface)
}

// [foreground token, background token, minimum, where the screens use it]
const PAIRS: [string, string, number, string][] = [
  ['foreground', 'background', TEXT, 'page text'],
  ['foreground', 'card', TEXT, 'text on cards'],
  ['foreground', 'popover', TEXT, 'menus and dialogs'],
  ['foreground', 'muted', TEXT, 'text on grey panels'],
  ['secondary-foreground', 'secondary', TEXT, 'secondary buttons'],
  ['muted-foreground', 'background', TEXT, 'quiet text on the page'],
  ['muted-foreground', 'card', TEXT, 'quiet text on cards'],
  ['muted-foreground', 'muted', TEXT, 'quiet text on grey panels'],
  ['primary-foreground', 'primary', TEXT, 'buttons, my message bubbles, badges'],
  ['primary-foreground', 'primary-hover', TEXT, 'a hovered button'],
  ['primary', 'background', TEXT, 'link buttons on the page'],
  ['primary', 'card', TEXT, 'link buttons on cards'],
  ['primary', 'muted', TEXT, 'the active section in the top bar'],
  ['accent-foreground', 'accent', TEXT, 'hovered menu items'],
  ['destructive', 'background', TEXT, 'red text on the page'],
  ['destructive', 'card', TEXT, 'red text on cards'],
  ['ring', 'background', MARK, "a focused field's border"],
  ['ring', 'card', MARK, "a focused field's border on a card"],
  ['brand-accent', 'background', MARK, "the active section's line"],
]

describe('the palette in index.css', () => {
  describe.each(THEMES)('%s theme', (theme, tokens) => {
    it('defines every palette token in a notation the check can read', () => {
      for (const name of PALETTE) {
        expect(() => color(tokens, name), `--${name}`).not.toThrow()
      }
    })

    // A colour a screen can't show gets pulled back by the browser, and
    // its painted contrast would no longer be the one computed here.
    //
    // `destructive` is the exception, on purpose: it is shadcn's red
    // (Tailwind's red-600), left as it was (decisions §39), and it lies
    // outside sRGB. A browser on an ordinary screen clips it to the nearest
    // red it can show — which is what `color()` does too, so its contrast
    // below is checked on the clipped colour, the one actually painted.
    it('keeps every palette colour inside what a screen can show', () => {
      for (const name of PALETTE.filter((token) => token !== 'destructive')) {
        expect(isInGamut(parseColor(tokens[name])), `--${name}`).toBe(true)
      }
    })

    // The pairs below would pass for a theme whose page and text were
    // swapped; this says which way round each theme is.
    it('draws light text on a dark page, or dark text on a light one', () => {
      const page = relativeLuminance(color(tokens, 'background'))
      const text = relativeLuminance(color(tokens, 'foreground'))
      expect(page > text).toBe(theme === 'light')
    })

    it.each(PAIRS)('%s on %s ≥ %s:1 (%s)', (fg, bg, minimum) => {
      const surface = color(tokens, bg)
      const ratio = contrastRatio(onSurface(tokens, fg, surface), surface)
      expect(ratio).toBeGreaterThanOrEqual(minimum)
    })

    // "Yours" (YoursBadge): teal text on a 10% teal tint, on a card.
    it('keeps the "Yours" badge readable (primary on primary/10, on a card)', () => {
      const card = color(tokens, 'card')
      const tint = over({ ...color(tokens, 'primary'), alpha: 0.1 }, card)
      expect(contrastRatio(color(tokens, 'primary'), tint)).toBeGreaterThanOrEqual(TEXT)
    })
  })

  // A token missing from `.dark` silently inherits the LIGHT value — often
  // still above the minimums (the light teal ring is 3.4:1 on the dark page),
  // so the pairs alone wouldn't notice. Each theme sets its own.
  it('the dark theme sets every palette token itself', () => {
    const own = tokensOf('.dark')
    expect(PALETTE.filter((name) => !(name in own))).toEqual([])
  })

  // The reason coral is not the primary colour (decisions §39), kept as a
  // fact the code can check: if this ever passes, the decision deserves a
  // second look.
  it('coral is too light for white text — the reason it is only an accent', () => {
    const coral = color(light, 'brand-accent')
    const white = color(light, 'primary-foreground')
    expect(contrastRatio(white, coral)).toBeLessThan(TEXT)
  })
})