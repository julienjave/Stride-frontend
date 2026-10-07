import { useState } from 'react'
import { useForm, useWatch, Controller } from 'react-hook-form'
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
import { AddressFields } from '@/common/address/AddressFields'
import { TagListField } from '@/common/TagListField'
import { sendInvitation } from '@/invitations/api'
import { createUser } from './api'
import {
  createUserSchema,
  SPECIALTY_RULES,
  type CreateUserFormInput,
  type CreateUserFormValues,
} from './schemas'
import type { CreatedUser } from './types'

export function CreateUserPage() {
  // Three types, because the schema TRANSFORMS a value (specialties: a
  // tag draft while typing, a string[] once submitted — see schemas.ts):
  // what the fields hold, a context type we don't use, and what the
  // submit handler receives after validation.
  const form = useForm<CreateUserFormInput, unknown, CreateUserFormValues>({
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
  // without watching, switching from "patient" to "practitioner" wouldn't
  // swap which extra fields are shown until something else happened to
  // trigger a re-render.
  //
  // useWatch rather than form.watch(): the same value, through a hook the
  // React Compiler understands (form.watch() made it skip this component
  // — the "incompatible library" lint warning).
  const role = useWatch({ control: form.control, name: 'role' })
  const watchedCountry = useWatch({ control: form.control, name: 'addressCountry' })

  const { data: clinics, isLoading: isLoadingClinics } = useClinics()

  // No usersQueryKey/list cache to update — there's no users list page
  // yet (that's the next roadmap item), so there's nothing to invalidate.
  // On success, this just remembers the created user long enough to show
  // a confirmation and offer "create another," rather than navigating
  // anywhere — there's no /admin/users/:id page to send them to yet.
  //
  // The created account comes back with its first invitation (accounts are
  // created without a password — the person chooses theirs by accepting
  // the emailed invitation), which is what the confirmation reports.
  const [lastCreated, setLastCreated] = useState<CreatedUser | null>(null)

  // Only offered when the invitation email failed: the account and its
  // invitation exist either way, so the fix is sending a new one — not
  // creating the account again (that would be a 409, email already taken).
  const resendMutation = useMutation({
    mutationFn: sendInvitation,
    onSuccess: (sent) =>
      // Replace the reported invitation with the new one: its emailSent
      // says whether THIS attempt worked. The functional form reads the
      // latest state, not the value captured when the click happened.
      setLastCreated((created) =>
        created && {
          ...created,
          invitation: {
            id: sent.id,
            status: sent.status,
            expiresAt: sent.expiresAt,
            emailSent: sent.emailSent,
          },
        },
      ),
  })

  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: (user) => {
      setLastCreated(user)
      // A new account starts with a clean slate: no leftover error or
      // pending state from resending the PREVIOUS account's invitation.
      resendMutation.reset()
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
        <div
          role="status"
          className={
            lastCreated.invitation.emailSent
              ? 'space-y-1 rounded-lg border border-green-600/30 bg-green-600/10 p-3 text-sm'
              : 'space-y-2 rounded-lg border border-amber-600/40 bg-amber-500/10 p-3 text-sm'
          }
        >
          <p>
            Created {lastCreated.firstName} {lastCreated.lastName} ({lastCreated.email}) as{' '}
            {lastCreated.roles.join(', ')}.
          </p>
          {lastCreated.invitation.emailSent ? (
            <p>
              We emailed them an invitation to choose their password. The link works until{' '}
              {formatExpiry(lastCreated.invitation.expiresAt)}.
            </p>
          ) : (
            <>
              <p>
                The invitation email could not be sent. The account exists — send the
                invitation again so they can choose their password.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={resendMutation.isPending}
                onClick={() => resendMutation.mutate(lastCreated.id)}
              >
                {resendMutation.isPending ? 'Sending…' : 'Send the invitation again'}
              </Button>
              {resendMutation.isError && (
                <p className="text-destructive">
                  {resendMutation.error instanceof ApiError
                    ? resendMutation.error.messages.join(', ')
                    : 'Something went wrong'}
                </p>
              )}
            </>
          )}
        </div>
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

        <AddressFields
          control={form.control}
          register={form.register}
          errors={form.formState.errors}
          watchedCountry={watchedCountry}
        />

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
              <Label htmlFor="specialties">Specialties (optional)</Label>
              {/* A Controller, like the role Select above: TagListField
                  isn't a native input, so register() can't attach to it.
                  The form holds its whole draft (chips + typed text);
                  fieldState.error is the schema's message after a
                  submit attempt. */}
              <Controller
                control={form.control}
                name="specialties"
                render={({ field, fieldState }) => (
                  <TagListField
                    id="specialties"
                    value={field.value}
                    onChange={field.onChange}
                    error={fieldState.error?.message}
                    {...SPECIALTY_RULES}
                  />
                )}
              />
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

// When the invitation link stops working, in the viewer's own language and
// time zone — an expiry is a moment in time, not a calendar date (unlike a
// date of birth, which formatCalendarDate pins to UTC).
function formatExpiry(expiresAt: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(
    new Date(expiresAt),
  )
}