import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { registerClinic } from './api'
import { currentUserQueryKey } from './useCurrentUser'
import { registerClinicSchema, type RegisterClinicFormValues } from './schemas'
import { ApiError } from '@/api/client'

export function RegisterClinicPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const form = useForm<RegisterClinicFormValues>({
    resolver: zodResolver(registerClinicSchema),
  })

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
            <Label htmlFor="clinicAddress">Address (optional)</Label>
            <Input
              id="clinicAddress"
              autoComplete="street-address"
              aria-invalid={!!form.formState.errors.clinicAddress}
              {...form.register('clinicAddress')}
            />
            {form.formState.errors.clinicAddress && (
              <p className="text-sm text-destructive">
                {form.formState.errors.clinicAddress.message}
              </p>
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