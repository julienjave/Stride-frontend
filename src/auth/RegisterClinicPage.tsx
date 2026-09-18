import { useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router'
import { Country, State } from 'country-state-city'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { registerClinic } from './api'
import { currentUserQueryKey } from './useCurrentUser'
import { registerClinicSchema, type RegisterClinicFormValues } from './schemas'
import { ApiError } from '@/api/client'

// Loaded once at module scope — same reasoning as AddressFields.tsx's
// identical constant: the underlying dataset never changes at runtime.
const ALL_COUNTRIES = Country.getAllCountries()

export function RegisterClinicPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const form = useForm<RegisterClinicFormValues>({
    resolver: zodResolver(registerClinicSchema),
  })
  const watchedClinicCountry = form.watch('clinicAddressCountry')

  // Same "only one outcome shape" reasoning as RegisterPage's mutation —
  // registerClinic() always resolves to a plain RegisterClinicResult (see
  // api.ts), never a union, so there's no branch to model here either.
  const registerClinicMutation = useMutation({
    mutationFn: registerClinic,
    onSuccess: (user) => {
      queryClient.setQueryData(currentUserQueryKey, user)
      void navigate('/')
    },
  })

  // Option B from the handoff: registerClinic() can ONLY ever return a 403
  // for one specific reason — an administrator already exists somewhere,
  // meaning this one-time setup step has already been permanently closed.
  // Checking statusCode alone is sufficient to identify that exact case
  // (confirmed against the backend: it's the only 403 this endpoint can
  // produce), so there's no need to also inspect the message text.
  const error = registerClinicMutation.error
  const isSetupAlreadyDone = error instanceof ApiError && error.statusCode === 403

  // Same cascading behavior as AddressFields.tsx's identical logic, just
  // inlined here rather than shared — this is the ONLY consumer with
  // clinicAddress*-prefixed fields, so a reusable component parameterized
  // by a field-name prefix would add real generality for exactly one
  // caller, which isn't worth the complexity it'd add for every OTHER
  // consumer of AddressFields.
  const statesForClinicCountry = useMemo(
    () => (watchedClinicCountry ? State.getStatesOfCountry(watchedClinicCountry) : []),
    [watchedClinicCountry],
  )

  return (
    <div className="mx-auto mt-24 max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">Set up your clinic</h1>
      <p className="text-sm text-muted-foreground">
        This one-time setup creates your clinic and its first administrator account.
      </p>
      <form
        onSubmit={(e) =>
          void form.handleSubmit((values) => registerClinicMutation.mutate(values))(e)
        }
        className="space-y-4"
        noValidate
      >
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">Clinic details</h2>

          <div className="space-y-1">
            <Label htmlFor="clinicName">Clinic name</Label>
            <Input
              id="clinicName"
              autoComplete="organization"
              aria-invalid={!!form.formState.errors.clinicName}
              {...form.register('clinicName')}
            />
            {form.formState.errors.clinicName && (
              <p className="text-sm text-destructive">
                {form.formState.errors.clinicName.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="clinicEmail">Clinic email</Label>
            <Input
              id="clinicEmail"
              type="email"
              aria-invalid={!!form.formState.errors.clinicEmail}
              {...form.register('clinicEmail')}
            />
            {form.formState.errors.clinicEmail && (
              <p className="text-sm text-destructive">
                {form.formState.errors.clinicEmail.message}
              </p>
            )}
          </div>

          {/* All four clinic fields below are optional — same "no asterisk,
              no required validation, Label text says so" convention as
              RegisterPage's phone/address fields. */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="clinicPhone">Phone (optional)</Label>
              <Input
                id="clinicPhone"
                type="tel"
                autoComplete="tel"
                aria-invalid={!!form.formState.errors.clinicPhone}
                {...form.register('clinicPhone')}
              />
              {form.formState.errors.clinicPhone && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.clinicPhone.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="clinicWebsite">Website (optional)</Label>
              <Input
                id="clinicWebsite"
                type="url"
                autoComplete="url"
                aria-invalid={!!form.formState.errors.clinicWebsite}
                {...form.register('clinicWebsite')}
              />
              {form.formState.errors.clinicWebsite && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.clinicWebsite.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="clinicAddressLine1">Address line 1 (optional)</Label>
            <Input
              id="clinicAddressLine1"
              autoComplete="address-line1"
              aria-invalid={!!form.formState.errors.clinicAddressLine1}
              {...form.register('clinicAddressLine1')}
            />
            {form.formState.errors.clinicAddressLine1 && (
              <p className="text-sm text-destructive">
                {form.formState.errors.clinicAddressLine1.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="clinicAddressLine2">
              Suite, floor, etc. (optional)
            </Label>
            <Input
              id="clinicAddressLine2"
              autoComplete="address-line2"
              {...form.register('clinicAddressLine2')}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="clinicAddressCity">City (optional)</Label>
            <Input
              id="clinicAddressCity"
              autoComplete="address-level2"
              aria-invalid={!!form.formState.errors.clinicAddressCity}
              {...form.register('clinicAddressCity')}
            />
            {form.formState.errors.clinicAddressCity && (
              <p className="text-sm text-destructive">
                {form.formState.errors.clinicAddressCity.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="clinicAddressPostalCode">Postal code (optional)</Label>
              <Input
                id="clinicAddressPostalCode"
                autoComplete="postal-code"
                aria-invalid={!!form.formState.errors.clinicAddressPostalCode}
                {...form.register('clinicAddressPostalCode')}
              />
              {form.formState.errors.clinicAddressPostalCode && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.clinicAddressPostalCode.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="clinicAddressCountry">Country (optional)</Label>
              <Controller
                control={form.control}
                name="clinicAddressCountry"
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger id="clinicAddressCountry" className="w-full">
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
              {form.formState.errors.clinicAddressCountry && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.clinicAddressCountry.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="clinicAddressState">State/Province (if applicable)</Label>
            {/* Same dropdown-with-text-fallback behavior as
                AddressFields.tsx — see that file's comment for why. */}
            {statesForClinicCountry.length > 0 ? (
              <Controller
                control={form.control}
                name="clinicAddressState"
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger id="clinicAddressState" className="w-full">
                      <SelectValue placeholder="Select a state/province" />
                    </SelectTrigger>
                    <SelectContent>
                      {statesForClinicCountry.map((state) => (
                        <SelectItem key={state.isoCode} value={state.name}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            ) : (
              <Input id="clinicAddressState" {...form.register('clinicAddressState')} />
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">Your account</h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                autoComplete="given-name"
                aria-invalid={!!form.formState.errors.firstName}
                {...form.register('firstName')}
              />
              {form.formState.errors.firstName && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.firstName.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                autoComplete="family-name"
                aria-invalid={!!form.formState.errors.lastName}
                {...form.register('lastName')}
              />
              {form.formState.errors.lastName && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={!!form.formState.errors.email}
              {...form.register('email')}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>

          {/* Deliberately no phone/address inputs here for the admin —
              RegisterClinicDto accepts them, but this one-time bootstrap
              form intentionally omits them, deferred to a future
              profile-edit screen instead (decision confirmed, not an
              oversight). position IS included: it's role/title
              information, not contact information, so it doesn't fall
              under that same deferral. */}
          <div className="space-y-1">
            <Label htmlFor="position">Position (optional)</Label>
            <Input
              id="position"
              autoComplete="organization-title"
              aria-invalid={!!form.formState.errors.position}
              {...form.register('position')}
            />
            {form.formState.errors.position && (
              <p className="text-sm text-destructive">
                {form.formState.errors.position.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!form.formState.errors.password}
              {...form.register('password')}
            />
            {form.formState.errors.password && (
              <p className="text-sm text-destructive">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!form.formState.errors.confirmPassword}
              {...form.register('confirmPassword')}
            />
            {form.formState.errors.confirmPassword && (
              <p className="text-sm text-destructive">
                {form.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>
        </div>

        {registerClinicMutation.isError &&
          (isSetupAlreadyDone ? (
            <p className="text-sm text-muted-foreground">
              An administrator account already exists — this one-time setup step has already
              been completed.{' '}
              <Link to="/login" className="underline">
                Log in instead
              </Link>
            </p>
          ) : (
            <p className="text-sm text-destructive">
              {error instanceof ApiError ? error.messages.join(', ') : 'Something went wrong'}
            </p>
          ))}

        <Button type="submit" disabled={registerClinicMutation.isPending}>
          {registerClinicMutation.isPending ? 'Setting up…' : 'Create clinic'}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="underline">
          Log in
        </Link>
      </p>
    </div>
  )
}