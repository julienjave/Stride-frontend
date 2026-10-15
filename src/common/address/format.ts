import { findCountry } from './addressData'
import type { Address } from './types'

// Turns a stored address into the lines a person expects to read, in a
// common international order:
//
//   12 Rue de la Paix          ← line 1
//   Apt 4                      ← line 2 (if any)
//   75002 Paris                ← postal code + city
//   Île-de-France              ← state/province (if any)
//   France                     ← country NAME, not the stored ISO code
//
// Missing parts are simply skipped, so no line is ever blank. An address
// with nothing at all returns an empty array — the caller decides what
// "no address" looks like ("Not set").
//
// A pure function (no React, no state), so it is tested directly with
// plain inputs, and any screen that shows an address can reuse it.
export function formatAddressLines(address: Address): string[] {
  const cityLine = [address.addressPostalCode, address.addressCity]
    .filter(Boolean)
    .join(' ')

  return [
    address.addressLine1,
    address.addressLine2,
    cityLine,
    address.addressState,
    countryName(address.addressCountry),
  ].filter((line): line is string => !!line)
}

// The database stores the ISO 3166-1 alpha-2 code ('FR') — the dropdown's
// value (see AddressFields). People read names. An unknown code (which
// the backend's 2-letter check can't rule out) falls back to showing the
// code itself rather than hiding it.
function countryName(code: string | null): string | null {
  if (!code) return null
  return findCountry(code)?.name ?? code
}