import type { AddressFormValues } from './schemas'

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