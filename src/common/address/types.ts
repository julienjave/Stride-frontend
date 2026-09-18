// The real six-field address shape every address-bearing resource
// (clinics, users) now returns, replacing the old single `address`
// string. Defined once here, reused via `extends`/intersection wherever
// a resource carries an address, so the shape can't drift between
// clinics/types.ts and users/types.ts.
//
// Every field is `string | null`, not `?`, matching this codebase's
// established nullable-vs-optional convention (see Clinic's own comment
// for the full reasoning): these are real, always-present JSON keys that
// simply allow an absent value, not keys that might be missing entirely.
//
// addressCountry holds an ISO 3166-1 alpha-2 code ('US', 'CA', ...) —
// the country dropdown's value, not a display name. addressState holds
// whatever string was actually selected or typed, since not every
// country has a fixed subdivision list (see AddressFields.tsx for the
// dropdown-with-text-fallback behavior this enables).
export interface Address {
  addressLine1: string | null
  addressLine2: string | null
  addressCity: string | null
  addressState: string | null
  addressPostalCode: string | null
  addressCountry: string | null
}