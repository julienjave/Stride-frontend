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

import { z } from 'zod'

// --- FIELD SCHEMAS --------------------------------------------------------
//
// Mirrors CreateClinicDto/CreateUserDto's own @MaxLength values exactly —
// see the backend's has-started-address.ts for the shared requiredness
// rule this file's superRefine (below) mirrors on the client side.

export const addressLine1Schema = z.string().max(255, 'Address line 1 is too long')
export const addressLine2Schema = z.string().max(255, 'Address line 2 is too long')
export const addressCitySchema = z.string().max(100, 'City is too long')
export const addressStateSchema = z.string().max(100, 'State/Province is too long')
export const addressPostalCodeSchema = z.string().max(20, 'Postal code is too long')

// NOT z.string().length(2, ...) — deliberately. That would ALSO reject an
// empty string (length 0 ≠ 2), which duplicates superRefine's own "Select
// a country" message the moment someone leaves it blank — the exact same
// bug this project already found and fixed once with licenseNumberSchema
// (see users/schemas.ts's comment on that). Letting '' through here and
// leaving requiredness entirely to superRefine means each problem gets
// exactly one message: "too short/long" from here, "required" from there.
export const addressCountrySchema = z
  .string()
  .refine((value) => value === '' || value.length === 2, {
    message: 'Select a valid country',
  })

// --- THE ADDRESS BLOCK -----------------------------------------------------
//
// Every field optional at the object level — same reasoning as
// createUserSchema's role-specific fields: the REAL enforcement of
// "required, but only once you've started" lives entirely in superRefine
// below, not here.
const baseAddressObjectSchema = z.object({
  addressLine1: addressLine1Schema.optional(),
  addressLine2: addressLine2Schema.optional(),
  addressCity: addressCitySchema.optional(),
  addressState: addressStateSchema.optional(),
  addressPostalCode: addressPostalCodeSchema.optional(),
  // The country dropdown's value — an ISO 3166-1 alpha-2 code ('US',
  // 'CA', ...), not a display name. See AddressFields.tsx for where this
  // actually gets populated.
  addressCountry: addressCountrySchema.optional(),
})

// Mirrors the backend's hasStartedAddress() exactly — line1, city, postal
// code, and country are "core"; line2 and state are not (not every
// country has a state/province concept, and an apartment/suite number
// isn't meaningful on its own).
function hasStartedAddress(data: {
  addressLine1?: string
  addressCity?: string
  addressPostalCode?: string
  addressCountry?: string
}): boolean {
  return (
    !!data.addressLine1 ||
    !!data.addressCity ||
    !!data.addressPostalCode ||
    !!data.addressCountry
  )
}

// Exported so other form schemas (createClinicSchema, createUserSchema,
// registerSchema, registerClinicSchema) can call this SAME function from
// their own .superRefine(), after merging addressObjectShape's fields
// into their own bigger object — reusing the actual validation logic,
// not just the field shapes.
export function addAddressIssues(
  data: {
    addressLine1?: string
    addressCity?: string
    addressPostalCode?: string
    addressCountry?: string
  },
  ctx: z.RefinementCtx,
) {
  if (!hasStartedAddress(data)) return

  if (!data.addressLine1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['addressLine1'],
      message: 'Address line 1 is required',
    })
  }
  if (!data.addressCity) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['addressCity'],
      message: 'City is required',
    })
  }
  if (!data.addressPostalCode) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['addressPostalCode'],
      message: 'Postal code is required',
    })
  }
  if (!data.addressCountry) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['addressCountry'],
      message: 'Country is required',
    })
  }
}

export const addressSchema = baseAddressObjectSchema.superRefine(addAddressIssues)

export type AddressFormValues = z.infer<typeof addressSchema>

// A plain object matching addressSchema's own optional-field shape —
// used for "spread this into a bigger form schema," since
// z.object({...other fields, ...addressObjectShape}) is how every
// consuming schema (createClinicSchema, createUserSchema, etc.) actually
// merges this in, rather than nesting it under its own sub-key.
export const addressObjectShape = baseAddressObjectSchema.shape