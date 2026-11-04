// Generates the address data the app ships: every country's ISO code and
// name, and each country's states / provinces — taken from Unicode CLDR
// (the Common Locale Data Repository, the data browsers and ICU use) and
// NOTHING else.
//
//   npm run generate:address-data
//
// Three CLDR packages, all devDependencies pinned to one CLDR version:
//   cldr-core               supplemental/subdivisionContainment.json —
//                           which subdivisions each country (and each
//                           subdivision) contains; also the country codes'
//                           numbers and the deprecated codes
//   cldr-subdivisions-full  subdivisions/en/en.json — subdivisions' names
//   cldr-localenames-full   main/en/territories.json — countries' names
// CLDR's data is under the Unicode License v3, which asks for its notice
// to travel with copies: see LICENSE-CLDR.txt and NOTICE. (The previous
// source, country-state-city, was GPL-3.0 — copyleft, which an Apache 2.0
// repository can't ship.)
//
// Why not import CLDR in the app? Its files hold every language's names
// (tens of MB); Stride uses English names and codes. The output keeps the
// format the app always read — [code, name] pairs — because the database
// stores what the forms send: a country's CODE ('FR') and a state's NAME
// ('Quebec').
//
// The output is a SNAPSHOT: the build copies it into the bundle, and
// production never asks anything live. It changes only when CLDR is
// upgraded (or a rule below changes), and
// src/common/address/addressData.test.ts fails until this script is run
// again — so a stale copy can't go unnoticed.
//
// A plain .mjs file (no TypeScript): it runs with `node` alone, on any
// supported version, without a build step.

import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

// ---------------------------------------------------------------------------
// The rules — decided with the person, country by country (2026-11-04). Most
// countries use CLDR's TOP level (US states, Canadian provinces, German
// Länder…). These are the exceptions, each for the level an ADDRESS in that
// country actually names:

// One level down: the level above is not what an address uses.
//   DO  10 planning regions (2004) → the 31 provinces + Distrito Nacional
//   ES  autonomous communities → provinces (+ Ceuta, Melilla)
//   ID  7 geographic island groups (Java, Sumatra…) → the 38 provinces
//   IE  the 4 historic provinces → the 26 counties ("Co. Cork")
//   IQ  "Kurdistan" wraps three governorates → the 18 governorates
//   IT  regions → provinces ("00184 Roma RM")
//   PH  regions → provinces (+ Metro Manila)
// A top-level entry with nothing under it stays as it is (Ceuta, Aosta
// Valley, Metro Manila): it IS the second level there.
const SECOND_LEVEL = new Set(['DO', 'ES', 'ID', 'IE', 'IQ', 'IT', 'PH'])

// No list at all — the form's free-text field instead:
//   FR  French addresses have no region line; CLDR's top level also mixes
//       the regions with places that are countries of their own in the list
//       (St. Barthélemy, New Caledonia…)
//   GB  UK addresses name neither the 4 nations nor the 217 councils
const NO_LIST = new Set(['FR', 'GB'])

// Subdivisions CLDR (v49) lists without an English name. Each one must be
// listed here, so a NEW gap in a later CLDR version stops this script
// instead of silently dropping a place.
//   cnhk, cnmo, cntw  Hong Kong, Macao, Taiwan: each is a country of its own
//                     in the list → left out of China's
//   cnnm              Inner Mongolia: CLDR's containment says `cnnm`, its
//                     alias table points to `cnmn`, and neither has a name —
//                     a gap in CLDR itself → the name, written here
const LEFT_OUT = new Set(['cnhk', 'cnmo', 'cntw'])
const MISSING_NAMES = { cnnm: 'Inner Mongolia' }

// Kosovo: no ISO 3166-1 code (XK is a user-assigned code, used by the EU,
// banks and CLDR), but a country people live in. The previous data had it.
const EXTRA_COUNTRIES = ['XK']
// ---------------------------------------------------------------------------

// createRequire gives this ES module CommonJS's `require.resolve`, which
// finds a file inside an installed package the way Node does (walking up
// to node_modules) — so the script works from any working directory.
const require = createRequire(import.meta.url)
const readPackageJson = (file) => JSON.parse(readFileSync(require.resolve(file), 'utf8'))

const containment = readPackageJson('cldr-core/supplemental/subdivisionContainment.json')
  .supplemental.subdivisionContainment
const codeMappings = readPackageJson('cldr-core/supplemental/codeMappings.json').supplemental
  .codeMappings
const deprecatedCodes = readPackageJson('cldr-core/supplemental/aliases.json').supplemental
  .metadata.alias.territoryAlias
const subdivisionNames = readPackageJson('cldr-subdivisions-full/subdivisions/en/en.json')
  .subdivisions.localeDisplayNames.subdivisions
const countryNames = readPackageJson('cldr-localenames-full/main/en/territories.json').main.en
  .localeDisplayNames.territories

// Sorted the way an English speaker expects: 'Åland Islands' beside
// 'Albania', not after 'Zimbabwe' (a plain `<` compares UTF-16 code units).
const byName = new Intl.Collator('en').compare
const sortByName = (entries) => entries.sort((a, b) => byName(a[1], b[1]))

// CLDR marks a name that would otherwise repeat another one with a
// superscript digit ('Île-de-France²', 'Lagunes²'). Meant for translators,
// not for a form.
const SUPERSCRIPT_DIGITS = /[¹²³⁰-⁹]/g
const stripMarker = (name) => name.replace(SUPERSCRIPT_DIGITS, '').trim()

// --- Countries. CLDR's "territories" also hold regions ('Europe'), groups
// ('European Union'), test codes ('XA') and codes no longer in use ('YU').
// What's kept: two capital letters, an ISO 3166-1 NUMBER below 900 (900+
// are private-use: EU 967, ZZ 999), and not deprecated — plus the extras.
// The rule reads only CLDR, so an upgrade that adds a country adds it here.
const countryCodes = Object.keys(codeMappings)
  .filter(
    (code) =>
      /^[A-Z]{2}$/.test(code) &&
      Number(codeMappings[code]._numeric ?? 999) < 900 &&
      !Object.hasOwn(deprecatedCodes, code),
  )
  .concat(EXTRA_COUNTRIES)

const countries = sortByName(
  countryCodes.map((code) => {
    // CLDR's standard name, never the "-alt-short" one: those include 'UK'
    // and 'US', too short for a list people scan.
    const name = countryNames[code]
    if (!name) throw new Error(`CLDR has no English name for the country ${code}`)
    return [code, name]
  }),
)

// --- Subdivisions. A CLDR id is the lower-case country code followed by
// the ISO 3166-2 subdivision code: 'caqc' is CA-QC, Quebec. The app stores
// and shows only the part after the country, upper-case: 'QC'.
const childrenOf = (id) => containment[id]?._contains ?? []

function nameOf(id) {
  if (Object.hasOwn(subdivisionNames, id)) return stripMarker(subdivisionNames[id])
  if (Object.hasOwn(MISSING_NAMES, id)) return MISSING_NAMES[id]
  throw new Error(
    `CLDR has no English name for the subdivision ${id}: add it to MISSING_NAMES or LEFT_OUT`,
  )
}

// Only countries that HAVE subdivisions get an entry: the app reads a
// missing key as "no states" (a plain text field instead of a list).
const states = {}
for (const [code] of countries) {
  if (NO_LIST.has(code)) continue
  let ids = childrenOf(code)
  if (SECOND_LEVEL.has(code)) {
    // flatMap: each top-level id becomes its children — or itself, when it
    // has none (Ceuta has no provinces; it is one).
    ids = ids.flatMap((id) => (childrenOf(id).length > 0 ? childrenOf(id) : [id]))
  }
  const list = ids
    .filter((id) => !LEFT_OUT.has(id))
    .map((id) => [id.slice(2).toUpperCase(), nameOf(id)])

  // The form's dropdown uses the NAME as each option's value (the database
  // stores names), so two equal names in one country would be one option
  // that can mean two places. Stripping a marker is what could cause it.
  const names = list.map(([, name]) => name)
  const repeated = names.find((name, i) => names.indexOf(name) !== i)
  if (repeated) throw new Error(`Two subdivisions of ${code} are both named '${repeated}'`)

  if (list.length > 0) states[code] = sortByName(list)
}

// A rule naming an id CLDR has since named or removed is a rule to delete:
// say so, without failing (the output is still right).
for (const id of Object.keys(MISSING_NAMES)) {
  if (Object.hasOwn(subdivisionNames, id)) {
    console.warn(`Note: CLDR now names ${id}; remove it from MISSING_NAMES`)
  }
}

// One entry per line, so an upgrade's changes read as a normal diff (one
// JSON line of 100 KB would show as "everything changed"). CRLF line
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

console.log(
  `${countries.length} countries; ${Object.keys(states).length} with a list, ` +
    `${Object.values(states).reduce((sum, list) => sum + list.length, 0)} subdivisions`,
)
