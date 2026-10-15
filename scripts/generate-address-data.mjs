// Generates the address data the app ships: every country's ISO code and
// name, and each country's states / provinces — taken from the
// `country-state-city` library and NOTHING else.
//
//   npm run generate:address-data
//
// Why not import the library in the app directly? It ships every country's
// and state's latitude, longitude, flag, phone code, currency and time
// zones — about 640 KB in the app's bundle — and Stride uses two fields of
// it. The values are copied unchanged (same codes, same names, same order),
// because the database stores what the forms send: a country's CODE
// ('FR') and a state's NAME ('Île-de-France').
//
// The output is a SNAPSHOT, like the library's own data always was: the
// build copies it into the bundle, and production never asks anything
// live. It changes only when the library is upgraded, and
// src/common/address/addressData.test.ts fails until this script is run
// again — so a stale copy can't go unnoticed.
//
// A plain .mjs file (no TypeScript): it runs with `node` alone, on any
// supported version, without a build step. Node loads the library's
// CommonJS build (its "main"), which is why the import below works here.

import { writeFileSync } from 'node:fs'
import { Country, State } from 'country-state-city'

// The library's own functions, not its JSON files: the forms used
// `Country.getAllCountries()` and `State.getStatesOfCountry()`, so this
// keeps exactly their order (getStatesOfCountry SORTS its answer — reading
// state.json directly would have given another order).
const countries = Country.getAllCountries().map((country) => [country.isoCode, country.name])

// Only countries that HAVE subdivisions get an entry: the app reads a
// missing key as "no states" (a plain text field instead of a list).
const states = {}
for (const [code] of countries) {
  const list = State.getStatesOfCountry(code).map((state) => [state.isoCode, state.name])
  if (list.length > 0) states[code] = list
}

// One entry per line, so an upgrade's changes read as a normal diff (one
// JSON line of 125 KB would show as "everything changed"). CRLF line
// endings: the repository's convention, and the same bytes on Windows and
// Linux, so regenerating on another machine doesn't show a whole-file
// change.
const EOL = '\r\n'
function writeJson(fileName, text) {
  writeFileSync(new URL(`../src/common/address/${fileName}`, import.meta.url), text + EOL)
  console.log(`Wrote src/common/address/${fileName}`)
}

writeJson(
  'countries.generated.json',
  ['[', countries.map((entry) => `  ${JSON.stringify(entry)}`).join(`,${EOL}`), ']'].join(EOL),
)

writeJson(
  'states.generated.json',
  [
    '{',
    Object.entries(states)
      .map(
        ([code, list]) =>
          `  ${JSON.stringify(code)}: [${EOL}` +
          list.map((entry) => `    ${JSON.stringify(entry)}`).join(`,${EOL}`) +
          `${EOL}  ]`,
      )
      .join(`,${EOL}`),
    '}',
  ].join(EOL),
)
