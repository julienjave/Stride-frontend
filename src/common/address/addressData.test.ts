import { describe, it, expect, vi } from 'vitest'
import countryEntries from './countries.generated.json'
import stateEntries from './states.generated.json'

// src/test-setup.ts replaces addressData.ts with a two-country fixture for
// every other test (the forms render faster). This file is ABOUT the real
// data, so it asks for the real modules: vi.importActual skips the mock.
const { Country, State } =
  await vi.importActual<typeof import('country-state-city')>('country-state-city')
const { ALL_COUNTRIES, findCountry, statesOfCountry } =
  await vi.importActual<typeof import('./addressData')>('./addressData')

const STALE = 'The address data is out of date: run `npm run generate:address-data`'

// What the generator should have written, rebuilt here from the installed
// library with the same two calls the forms used before. Written out in the
// test, not imported from the script: a mistake in the generator must not
// also be the expectation it's checked against.
function expectedFromLibrary() {
  const countries = Country.getAllCountries().map((country) => [country.isoCode, country.name])
  const states: Record<string, string[][]> = {}
  for (const [code] of countries) {
    const list = State.getStatesOfCountry(code).map((state) => [state.isoCode, state.name])
    if (list.length > 0) states[code] = list
  }
  return { countries, states }
}

describe('the generated address data', () => {
  // The guarantee: after `npm update country-state-city`, this fails until
  // the script is run again — a stale copy can't reach a build unnoticed.
  it('is exactly what the installed library says (codes, names, order)', () => {
    const expected = expectedFromLibrary()
    expect(countryEntries, STALE).toStrictEqual(expected.countries)
    expect(stateEntries, STALE).toStrictEqual(expected.states)
  })

  // A sanity check that the comparison above isn't comparing two empty
  // things (a broken generator AND a broken expectation would agree).
  it('holds every country and a known subdivision list', () => {
    expect(countryEntries.length).toBeGreaterThan(200)
    expect(statesOfCountry('CA').map((province) => province.name)).toContain('Quebec')
  })
})

describe('addressData', () => {
  it('lists every country as { isoCode, name }, in the library order', () => {
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

  it("gives a country's states as { isoCode, name }, in the library order", () => {
    expect(statesOfCountry('US')).toStrictEqual(
      State.getStatesOfCountry('US').map(({ isoCode, name }) => ({ isoCode, name })),
    )
  })

  it('gives no states for a country without any, or an unknown code', () => {
    // Aland Islands has no subdivisions in the library.
    expect(statesOfCountry('AX')).toStrictEqual([])
    expect(statesOfCountry('ZZ')).toStrictEqual([])
    // A "code" naming something every object inherits finds nothing either.
    expect(statesOfCountry('constructor')).toStrictEqual([])
  })
})