import countryEntries from './countries.generated.json'
import stateEntries from './states.generated.json'

// The countries and states / provinces the address forms offer — the ONE
// place the app reads them from.
//
// The two JSON files are GENERATED from Unicode CLDR's data (the packages
// cldr-core, cldr-subdivisions-full, cldr-localenames-full) by `npm run
// generate:address-data` (scripts/generate-address-data.mjs): each
// country's ISO code and English name, each country's subdivisions at the
// level its addresses use, nothing else. The database stores a country's
// CODE and a state's NAME, which is why the files keep exactly that.
// addressData.test.ts rebuilds them from the installed CLDR and fails if
// they differ. CLDR's licence notice: LICENSE-CLDR.txt (see NOTICE).
//
// Vite turns an imported .json file into a JavaScript module at build
// time, so this data is part of the bundle — a snapshot, never fetched.

// A country, or a state / province: its ISO code and its name.
export interface Place {
  isoCode: string
  name: string
}

// TypeScript reads the JSON files' types from their content: "an array of
// arrays of strings". The generator writes [code, name] pairs, but the
// type can't say "exactly two" without a cast (`as unknown as …`) that
// would also silence a real mistake — so an entry is taken as what
// TypeScript can check, and read by position. The sync test proves the
// shape.
function toPlace(entry: string[]): Place {
  return { isoCode: entry[0], name: entry[1] }
}

// Built once, when this module is first imported — the list never changes
// while the app runs.
export const ALL_COUNTRIES: readonly Place[] = countryEntries.map(toPlace)

const COUNTRY_BY_CODE = new Map(ALL_COUNTRIES.map((country) => [country.isoCode, country]))

// Typed as "any code → maybe a list": the generated file's own type has
// one property per real code, and the forms look codes up by a string.
const STATES: Record<string, string[][] | undefined> = stateEntries

// The country with this ISO code, or undefined for a code the list doesn't
// have (the backend only checks that a stored code has two letters).
export function findCountry(isoCode: string): Place | undefined {
  return COUNTRY_BY_CODE.get(isoCode)
}

// The country's states / provinces, sorted by name — empty when it has
// none (the forms then show a plain text field). Object.hasOwn, not
// STATES[isoCode]: a "code" like 'constructor' must not find something
// every JavaScript object inherits.
export function statesOfCountry(isoCode: string): readonly Place[] {
  if (!Object.hasOwn(STATES, isoCode)) return []
  return (STATES[isoCode] ?? []).map(toPlace)
}