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
// The real stylesheet, as text — see paletteContrast.test.ts for why `?raw`
// works for this one .css file (vite.config.ts's `test.css.include`).
import indexCss from '../index.css?raw'
import { READABLE_FONT_CLASS } from './font'

// jsdom draws no letters, so no test can SEE the font change. What can be
// checked is the chain the browser follows (decisions §39):
//   the class on <html> → redefines --app-font → which `font-sans` and
//   `font-heading` read → so every text, headings included, changes.
// Break any link and the setting would tick in the menu and change nothing.

// The value of `--name:` inside the rule starting with `selector {`.
function declaration(selector: string, name: string): string | undefined {
  const start = indexCss.indexOf(`${selector} {`)
  if (start === -1) return undefined
  const block = indexCss.slice(start, indexCss.indexOf('}', start))
  return new RegExp(`--${name}:\\s*([^;]+);`).exec(block)?.[1].trim()
}

describe('the font rules in index.css', () => {
  it('points the text and the headings at the --app-font variable, not at a font', () => {
    expect(declaration('@theme inline', 'font-sans')).toBe('var(--app-font)')
    expect(declaration('@theme inline', 'font-heading')).toBe('var(--app-font)')
  })

  it('sets Geist by default', () => {
    // The LAST `:root {` rule holding --app-font (the palette's comes first).
    const rules = indexCss.split(':root {').slice(1)
    const fontRule = rules.find((rule) => rule.split('}')[0].includes('--app-font'))
    expect(fontRule?.split('}')[0]).toMatch(/--app-font:\s*'Geist Variable', sans-serif;/)
  })

  it('switches to Atkinson Hyperlegible Next under the class font.ts puts on <html>', () => {
    expect(declaration(`.${READABLE_FONT_CLASS}`, 'app-font')).toBe(
      "'Atkinson Hyperlegible Next Variable', sans-serif",
    )
  })

  it('declares both fonts (the packages’ @font-face rules)', () => {
    expect(indexCss).toContain('@import "@fontsource-variable/geist";')
    expect(indexCss).toContain('@import "@fontsource-variable/atkinson-hyperlegible-next";')
  })
})