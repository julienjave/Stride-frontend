import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router'
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
import { ApiError } from '@/api/client'
import { useClinics } from '@/clinics/useClinics'
import { createUser } from './api'
import { createUserSchema, type CreateUserFormValues } from './schemas'
import type { User } from './types'

export function CreateUserPage() {
  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'patient' },
    // Without this, react-hook-form's DEFAULT behavior keeps a field's
    // last value in its internal state even after that field's input
    // unmounts from the DOM. Concretely: the form starts as role:
    // 'patient', so the dateOfBirth input briefly registers with ''.
    // Switching to 'practitioner' unmounts that input — but the stale ''
    // value survives internally, and dateOfBirthSchema (required,
    // wrapped in .optional() for the OTHER roles) rejects '' as invalid.
    // That silently blocks submission with an error on a field that
    // isn't even being shown anymore — confirmed by testing (a "does the
    // request even fire" test failed with no visible cause until the
    // schema was checked directly against the exact stale values
    // react-hook-form was actually holding). shouldUnregister: true is
    // built for precisely this shape of form: a field's value is
    // dropped, not kept, the moment its input leaves the DOM.
    shouldUnregister: true,
  })
  // Watching `role` (rather than reading form.getValues() once) is what
  // makes the conditional fields below actually re-render the instant the
  // person changes the dropdown — react-hook-form deliberately does NOT
  // re-render the whole form on every keystroke for performance, so
  // without watch(), switching from "patient" to "practitioner" wouldn't
  // swap which extra fields are shown until something else happened to
  // trigger a re-render.
  const role = form.watch('role')

  const { data: clinics, isLoading: isLoadingClinics } = useClinics()

  // No usersQueryKey/list cache to update — there's no users list page
  // yet (that's the next roadmap item), so there's nothing to invalidate.
  // On success, this just remembers the created user long enough to show
  // a confirmation and offer "create another," rather than navigating
  // anywhere — there's no /admin/users/:id page to send them to yet.
  const [lastCreated, setLastCreated] = useState<User | null>(null)

  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: (user) => {
      setLastCreated(user)
      // reset() with NO arguments — not reset({ role: 'patient' }) — on
      // purpose. Verified directly, in isolation: this react-hook-form
      // version only reliably clears a registered input's actual DOM
      // value for fields explicitly listed in reset()'s argument object;
      // any field left out keeps showing its old typed value on screen,
      // even though RHF's own internal state considers it reset. A bare
      // reset() falls back to the form's original defaultValues (just
      // `{ role: 'patient' }` here) and correctly clears every other
      // field to its empty starting state.
      form.reset()
    },
  })

  return (
    <div className="mx-auto mt-12 max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">Add a user</h1>

      {lastCreated && (
        <p className="rounded-lg border border-green-600/30 bg-green-600/10 p-3 text-sm">
          Created {lastCreated.firstName} {lastCreated.lastName} ({lastCreated.email}) as{' '}
          {lastCreated.roles.join(', ')}.
        </p>
      )}

      <form
        onSubmit={(e) =>
          void form.handleSubmit((values) => createUserMutation.mutate(values))(e)
        }
        className="space-y-4"
        noValidate
      >
        <div className="space-y-1">
          <Label htmlFor="role">Role</Label>
          {/* Controller bridges react-hook-form to a CONTROLLED component
              — Select isn't a native <input>, so it has no ref/onChange
              shape register() can attach to directly. Controller instead
              hands us `field` (value + onChange + a few other props) and
              wires whatever we render around them into the form's own
              state and validation, the same way register() would for a
              plain input. */}
          <Controller
            control={form.control}
            name="role"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patient">Patient</SelectItem>
                  <SelectItem value="practitioner">Practitioner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
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

        <div className="space-y-1">
          <Label htmlFor="password">Temporary password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!form.formState.errors.password}
            {...form.register('password')}
          />
          {form.formState.errors.password && (
            <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
          )}
        </div>

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
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input id="phone" type="tel" autoComplete="tel" {...form.register('phone')} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="address">Address (optional)</Label>
          <Input id="address" autoComplete="street-address" {...form.register('address')} />
        </div>

        {/* clinicId is REQUIRED for practitioner/patient (see schemas.ts's
            superRefine for why), and not shown at all for admin — an
            admin account isn't clinic-scoped anywhere in this app, so
            offering the field would just be a confusing, meaningless
            choice for that role. */}
        {(role === 'practitioner' || role === 'patient') && (
          <div className="space-y-1">
            <Label htmlFor="clinicId">Clinic</Label>
            <Controller
              control={form.control}
              name="clinicId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isLoadingClinics || clinics?.length === 0}
                >
                  <SelectTrigger id="clinicId" className="w-full">
                    <SelectValue
                      placeholder={
                        isLoadingClinics
                          ? 'Loading clinics…'
                          : clinics?.length === 0
                            ? 'No clinics yet — create one first'
                            : 'Select a clinic'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {clinics?.map((clinic) => (
                      <SelectItem key={clinic.id} value={String(clinic.id)}>
                        {clinic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.clinicId && (
              <p className="text-sm text-destructive">{form.formState.errors.clinicId.message}</p>
            )}
          </div>
        )}

        {role === 'practitioner' && (
          <>
            <div className="space-y-1">
              <Label htmlFor="licenseNumber">License number</Label>
              <Input
                id="licenseNumber"
                aria-invalid={!!form.formState.errors.licenseNumber}
                {...form.register('licenseNumber')}
              />
              {form.formState.errors.licenseNumber && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.licenseNumber.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="specialties">Specialties (optional, comma-separated)</Label>
              <Input id="specialties" {...form.register('specialties')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bio">Bio (optional)</Label>
              <Input id="bio" {...form.register('bio')} />
            </div>
          </>
        )}

        {role === 'patient' && (
          <div className="space-y-1">
            <Label htmlFor="dateOfBirth">Date of birth</Label>
            <Input
              id="dateOfBirth"
              type="date"
              aria-invalid={!!form.formState.errors.dateOfBirth}
              {...form.register('dateOfBirth')}
            />
            {form.formState.errors.dateOfBirth && (
              <p className="text-sm text-destructive">
                {form.formState.errors.dateOfBirth.message}
              </p>
            )}
          </div>
        )}

        {role === 'admin' && (
          <div className="space-y-1">
            <Label htmlFor="position">Position (optional)</Label>
            <Input id="position" {...form.register('position')} />
          </div>
        )}

        {createUserMutation.isError && (
          <p className="text-sm text-destructive">
            {createUserMutation.error instanceof ApiError
              ? createUserMutation.error.messages.join(', ')
              : 'Something went wrong'}
          </p>
        )}

        <Button type="submit" disabled={createUserMutation.isPending}>
          {createUserMutation.isPending ? 'Creating…' : 'Create user'}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        <Link to="/admin/users" className="underline">
          Back to users
        </Link>
      </p>
    </div>
  )
}