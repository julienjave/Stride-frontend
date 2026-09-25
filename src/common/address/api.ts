import type { AddressFormValues } from './schemas'
import type { Address } from './types'

// An address as a PATCH body: all six keys, each a value or null. It is
// structurally the same as Address (what the API returns) — named
// separately so a signature says which direction the data flows.
export type AddressPatch = Address

function emptyToUndefined(value: string | undefined) {
  return value === '' ? undefined : value
}

// Takes a submitted address form's six fields and returns them with any
// untouched ('') field converted to undefined — the same '' → undefined
// story every other optional field in this app already follows (see
// clinics/api.ts's createClinic, for one). Written once here rather than
// repeated as a six-field ternary chain in every api.ts function that
// submits an address.
export function toAddressPayload(values: AddressFormValues) {
  return {
    addressLine1: emptyToUndefined(values.addressLine1),
    addressLine2: emptyToUndefined(values.addressLine2),
    addressCity: emptyToUndefined(values.addressCity),
    addressState: emptyToUndefined(values.addressState),
    addressPostalCode: emptyToUndefined(values.addressPostalCode),
    addressCountry: emptyToUndefined(values.addressCountry),
  }
}

// The EDIT-time counterpart of toAddressPayload above, and the difference
// is exactly one value: '' becomes `null` here, not `undefined`.
//   - Creating something: an untouched field should be ABSENT from the
//     request (undefined → JSON.stringify drops the key → column stays
//     NULL by default).
//   - Editing something that already has an address: an emptied field
//     must actively CLEAR the stored value. Dropping the key would leave
//     the old value in place — the "clearing silently does nothing" bug
//     this project already hit once with sets/reps (see
//     deferred-improvements.md). `null` survives JSON.stringify as a real
//     `null`, which the backend writes as NULL.
// All six keys are always present, so saving an address replaces it as
// one unit — never half old, half new.
export function toAddressPatch(values: AddressFormValues): AddressPatch {
  return {
    addressLine1: emptyToNull(values.addressLine1),
    addressLine2: emptyToNull(values.addressLine2),
    addressCity: emptyToNull(values.addressCity),
    addressState: emptyToNull(values.addressState),
    addressPostalCode: emptyToNull(values.addressPostalCode),
    addressCountry: emptyToNull(values.addressCountry),
  }
}

// Also trims: " Paris " is saved as "Paris", and a field containing only
// spaces counts as empty.
function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  return trimmed === '' ? null : trimmed
}

// "Remove this address": every field cleared at once.
export const EMPTY_ADDRESS_PATCH: AddressPatch = {
  addressLine1: null,
  addressLine2: null,
  addressCity: null,
  addressState: null,
  addressPostalCode: null,
  addressCountry: null,
}