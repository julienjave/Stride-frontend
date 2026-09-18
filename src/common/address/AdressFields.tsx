import { useMemo } from 'react'
import {
  Controller,
  type Control,
  type FieldErrors,
  type FieldValues,
  type Path,
  type UseFormRegister,
} from 'react-hook-form'
import { Country, State } from 'country-state-city'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AddressFormValues } from './schemas'

// Loaded once at module scope, not per-render — Country.getAllCountries()
// parses a real (if small) embedded dataset every time it's called, and
// the list itself never changes during the app's lifetime.
const ALL_COUNTRIES = Country.getAllCountries()

interface AddressFieldsProps<TFieldValues extends FieldValues & AddressFormValues> {
  control: Control<TFieldValues>
  register: UseFormRegister<TFieldValues>
  errors: FieldErrors<TFieldValues>
  // watchedCountry drives which states/provinces (if any) the second
  // dropdown offers — passed in rather than watched internally, so this
  // component doesn't need its own subscription to a field it doesn't
  // own the source of truth for.
  watchedCountry: string | undefined
}

// Generic over TFieldValues (constrained to extend AddressFormValues) —
// this is what lets ONE component serve CreateClinicPage, CreateUserPage,
// RegisterPage, and RegisterClinicPage, each with their own, larger form
// shape, rather than four near-identical copies of this same JSX.
export function AddressFields<TFieldValues extends FieldValues & AddressFormValues>({
  control,
  register,
  errors,
  watchedCountry,
}: AddressFieldsProps<TFieldValues>) {
  // Recomputed only when the selected country actually changes, not on
  // every keystroke elsewhere in the form.
  const statesForCountry = useMemo(
    () => (watchedCountry ? State.getStatesOfCountry(watchedCountry) : []),
    [watchedCountry],
  )

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="addressLine1">Address line 1</Label>
        <Input
          id="addressLine1"
          autoComplete="address-line1"
          aria-invalid={!!errors.addressLine1}
          {...register('addressLine1' as Path<TFieldValues>)}
        />
        {errors.addressLine1 && (
          <p className="text-sm text-destructive">
            {errors.addressLine1.message as string}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="addressLine2">Apartment, suite, etc. (optional)</Label>
        <Input
          id="addressLine2"
          autoComplete="address-line2"
          {...register('addressLine2' as Path<TFieldValues>)}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="addressCity">City</Label>
        <Input
          id="addressCity"
          autoComplete="address-level2"
          aria-invalid={!!errors.addressCity}
          {...register('addressCity' as Path<TFieldValues>)}
        />
        {errors.addressCity && (
          <p className="text-sm text-destructive">{errors.addressCity.message as string}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="addressPostalCode">Postal code</Label>
          <Input
            id="addressPostalCode"
            autoComplete="postal-code"
            aria-invalid={!!errors.addressPostalCode}
            {...register('addressPostalCode' as Path<TFieldValues>)}
          />
          {errors.addressPostalCode && (
            <p className="text-sm text-destructive">
              {errors.addressPostalCode.message as string}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="addressCountry">Country</Label>
          <Controller
            control={control}
            name={'addressCountry' as Path<TFieldValues>}
            render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger id="addressCountry" className="w-full">
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_COUNTRIES.map((country) => (
                    <SelectItem key={country.isoCode} value={country.isoCode}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.addressCountry && (
            <p className="text-sm text-destructive">
              {errors.addressCountry.message as string}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="addressState">State/Province (if applicable)</Label>
        {/* Cascades on the selected country: a real dropdown when
            country-state-city has a subdivision list for it, a plain
            text input otherwise. Both cases write to the SAME
            addressState field — the backend stores whatever string
            ends up there either way, with no relationship to country
            enforced server-side (state isn't a "core" field, so this is
            a UX convenience, not a data-integrity boundary). */}
        {statesForCountry.length > 0 ? (
          <Controller
            control={control}
            name={'addressState' as Path<TFieldValues>}
            render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger id="addressState" className="w-full">
                  <SelectValue placeholder="Select a state/province" />
                </SelectTrigger>
                <SelectContent>
                  {statesForCountry.map((state) => (
                    <SelectItem key={state.isoCode} value={state.name}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        ) : (
          <Input id="addressState" {...register('addressState' as Path<TFieldValues>)} />
        )}
      </div>
    </div>
  )
}