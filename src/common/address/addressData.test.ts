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

import { describe, it, expect, vi } from 'vitest'
import containmentFile from 'cldr-core/supplemental/subdivisionContainment.json'
import codeMappingsFile from 'cldr-core/supplemental/codeMappings.json'
import aliasesFile from 'cldr-core/supplemental/aliases.json'
import subdivisionNamesFile from 'cldr-subdivisions-full/subdivisions/en/en.json'
import territoriesFile from 'cldr-localenames-full/main/en/territories.json'
import countryEntries from './countries.generated.json'
import stateEntries from './states.generated.json'

// src/test-setup.ts replaces addressData.ts with a two-country fixture for
// every other test (the forms render faster). This file is ABOUT the real
// data, so it asks for the real module: vi.importActual skips the mock.
const { ALL_COUNTRIES, findCountry, statesOfCountry } =
  await vi.importActual<typeof import('./addressData')>('./addressData')

const STALE = 'The address data is out of date: run `npm run generate:address-data`'

// The installed CLDR files, typed as what this test reads from them. Each is
// a plain lookup by key; `Record<string, …>` says so (TypeScript's own type
// for the imported JSON has one property per key, which a lookup by a
// computed string can't use).
const containment: Record<string, { _contains: string[] } | undefined> =
  containmentFile.supplemental.subdivisionContainment
// (Both fields optional: a type whose properties are all optional must share
// at least one with what's assigned to it, and some codes carry only
// `_alpha3`.)
const codeMappings: Record<string, { _numeric?: string; _alpha3?: string } | undefined> =
  codeMappingsFile.supplemental.codeMappings
const deprecatedCodes: Record<string, unknown> =
  aliasesFile.supplemental.metadata.alias.territoryAlias
const subdivisionNames: Record<string, string | undefined> =
  subdivisionNamesFile.subdivisions.localeDisplayNames.subdivisions
const countryNames: Record<string, string | undefined> =
  territoriesFile.main.en.localeDisplayNames.territories

// What the generator should have written, rebuilt here from the installed
// CLDR files with the rules agreed for each country. Written out in the
// test, not imported from the script: a mistake in the generator must not
// also be the expectation it's checked against — and changing a rule means
// changing it in both places, on purpose.
const SECOND_LEVEL = ['DO', 'ES', 'ID', 'IE', 'IQ', 'IT', 'PH']
const NO_LIST = ['FR', 'GB']
const LEFT_OUT = ['cnhk', 'cnmo', 'cntw']
const MISSING_NAMES: Record<string, string> = { cnnm: 'Inner Mongolia' }

function expectedFromCldr() {
  // An arrow around the collator, not `collator.compare` taken on its own: a
  // method pulled off its object may lose its `this` (the lint's
  // unbound-method rule). Intl.Collator happens to hand back a bound
  // function, but its type doesn't say so.
  const collator = new Intl.Collator('en')
  const byName = (a: string, b: string) => collator.compare(a, b)
  const sorted = (entries: string[][]) => entries.sort((a, b) => byName(a[1], b[1]))

  const codes = Object.keys(codeMappings).filter(
    (code) =>
      /^[A-Z]{2}$/.test(code) &&
      Number(codeMappings[code]?._numeric ?? 999) < 900 &&
      !(code in deprecatedCodes),
  )
  codes.push('XK')
  const countries = sorted(codes.map((code) => [code, countryNames[code] ?? '']))

  const childrenOf = (id: string) => containment[id]?._contains ?? []
  const states: Record<string, string[][]> = {}
  for (const [code] of countries) {
    if (NO_LIST.includes(code)) continue
    let ids = childrenOf(code)
    if (SECOND_LEVEL.includes(code)) {
      ids = ids.flatMap((id) => (childrenOf(id).length > 0 ? childrenOf(id) : [id]))
    }
    const list = ids
      .filter((id) => !LEFT_OUT.includes(id))
      .map((id) => [
        id.slice(2).toUpperCase(),
        (subdivisionNames[id] ?? MISSING_NAMES[id]).replace(/[\u00B9\u00B2\u00B3\u2070-\u2079]/g, '').trim(),
      ])
    if (list.length > 0) states[code] = sorted(list)
  }
  return { countries, states }
}

const names = (isoCode: string) => statesOfCountry(isoCode).map((state) => state.name)

describe('the generated address data', () => {
  // The guarantee: after a CLDR upgrade (or a rule change above), this
  // fails until the script is run again — a stale copy can't reach a build
  // unnoticed.
  it('is exactly what the installed CLDR says, with the agreed rules (codes, names, order)', () => {
    const expected = expectedFromCldr()
    expect(countryEntries, STALE).toStrictEqual(expected.countries)
    expect(stateEntries, STALE).toStrictEqual(expected.states)
  })

  // A sanity check that the comparison above isn't comparing two empty
  // things (a broken generator AND a broken expectation would agree).
  it('holds every country and a known subdivision list', () => {
    expect(countryEntries).toHaveLength(250)
    expect(names('CA')).toContain('Quebec')
    expect(names('US')).toContain('Illinois') // the name the backend's tests use
  })

  it('keeps only real countries: no groups, test codes or retired codes', () => {
    const codes = countryEntries.map(([code]) => code)
    for (const notACountry of ['EU', 'UN', 'ZZ', 'XA', 'YU', 'SU']) {
      expect(codes).not.toContain(notACountry)
    }
    expect(findCountry('XK')?.name).toBe('Kosovo')
  })

  it("uses CLDR's standard country names, not its short forms", () => {
    expect(findCountry('GB')?.name).toBe('United Kingdom') // short form: 'UK'
    expect(findCountry('US')?.name).toBe('United States') // short form: 'US'
  })

  it('sorts by English name, accents included', () => {
    // A plain `<` would put 'Åland Islands' after 'Zimbabwe'.
    const order = countryEntries.map(([, name]) => name)
    expect(order.indexOf('Åland Islands')).toBeLessThan(order.indexOf('Albania'))
  })

  it("strips CLDR's disambiguation markers", () => {
    // 'Lagunes²' in CLDR (Côte d'Ivoire's district, named like a region).
    expect(names('CI')).toContain('Lagunes')
    const everyName = Object.values(stateEntries).flatMap((list) => list.map(([, name]) => name))
    expect(everyName.filter((name) => /[\u00B9\u00B2\u00B3\u2070-\u2079]/.test(name))).toStrictEqual([])
  })

  it('never gives two subdivisions of one country the same name (the form stores the name)', () => {
    for (const [country, list] of Object.entries(stateEntries)) {
      const listNames = list.map(([, name]) => name)
      expect(new Set(listNames).size, country).toBe(listNames.length)
    }
  })

  it('goes one level down where addresses name provinces or counties', () => {
    expect(names('IT')).toContain('Rome') // a province…
    expect(names('IT')).not.toContain('Lazio') // …not its region
    expect(names('IT')).toContain('Aosta Valley') // a region with no province below it
    expect(names('ES')).toContain('Seville')
    expect(names('ES')).not.toContain('Andalusia')
    expect(names('ES')).toEqual(expect.arrayContaining(['Ceuta', 'Melilla']))
    expect(names('IE')).toContain('Cork')
    expect(names('IE')).not.toContain('Munster')
    expect(names('ID')).toContain('Bali')
    expect(names('ID')).not.toContain('Java')
    expect(names('PH')).toEqual(expect.arrayContaining(['Cebu', 'Metro Manila']))
    expect(names('IQ')).toHaveLength(18)
    expect(names('IQ')).toContain('Erbil')
    expect(names('IQ')).not.toContain('Kurdistan')
    expect(names('DO')).toContain('Santiago')
    expect(names('DO')).not.toContain('Cibao Norte')
  })

  it('keeps the top level everywhere else', () => {
    expect(names('DE')).toContain('Bavaria')
    expect(names('RS')).toContain('Vojvodina') // not its districts
  })

  it('gives France and the United Kingdom no list (a free-text field)', () => {
    expect(statesOfCountry('FR')).toStrictEqual([])
    expect(statesOfCountry('GB')).toStrictEqual([])
  })

  it("fills CLDR's gaps in China: Inner Mongolia named, Hong Kong / Macao / Taiwan left to their own entries", () => {
    expect(subdivisionNames.cnnm).toBeUndefined() // still a gap in the installed CLDR
    expect(names('CN')).toContain('Inner Mongolia')
    const codes = statesOfCountry('CN').map((state) => state.isoCode)
    for (const ownCountry of ['HK', 'MO', 'TW']) expect(codes).not.toContain(ownCountry)
    expect(names('CN')).toHaveLength(31)
    expect(findCountry('TW')).toBeDefined()
  })
})

describe('addressData', () => {
  it('lists every country as { isoCode, name }, in the generated order', () => {
    expect(ALL_COUNTRIES).toHaveLength(countryEntries.length)
    expect(ALL_COUNTRIES[0]).toStrictEqual({
      isoCode: countryEntries[0][0],
      name: countryEntries[0][1],
    })
  })

  it('finds a country by its code, and nothing for an unknown one', () => {
    expect(findCountry('FR')).toStrictEqual({ isoCode: 'FR', name: 'France' })
    expect(findCountry('ZZ')).toBeUndefined()
  })

  it("gives a country's states as { isoCode, name }, in the generated order", () => {
    expect(statesOfCountry('US')).toStrictEqual(
      stateEntries.US.map(([isoCode, name]) => ({ isoCode, name })),
    )
  })

  it('gives no states for a country without any, or an unknown code', () => {
    // Åland Islands has no subdivisions in CLDR.
    expect(statesOfCountry('AX')).toStrictEqual([])
    expect(statesOfCountry('ZZ')).toStrictEqual([])
    // A "code" naming something every object inherits finds nothing either.
    expect(statesOfCountry('constructor')).toStrictEqual([])
  })
})