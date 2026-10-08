import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router'
import { ApiError } from '@/api/client'
import { useCurrentUser } from '@/auth/useCurrentUser'
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
import { ignoreEmptySelection } from '@/common/ignoreEmptySelection'
import { InvitationSentNotice } from '@/invitations/InvitationSentNotice'
import type { CreatedUser } from '@/users/types'
import { invitePatient } from './api'
import { invitePatientSchema, type InvitePatientFormValues } from './schemas'

// "Invite a new patient" (/practitioner/patients/invite) — the second half
// of "Add patient", reached from the directory search when the patient
// isn't in Stride yet. Creates the account (no password) and emails the
// invitation; the backend puts me on the new patient's care team in the
// same transaction, so they're in "My patients" straight away.
//
// Arrives with ?firstName=…&lastName=… when the search was for a name, so
// the practitioner doesn't type it twice.
export function InvitePatientPage() {
  const [searchParams] = useSearchParams()
  const { data: currentUser } = useCurrentUser()
  const queryClient = useQueryClient()

  // The clinics I may invite into: MINE (/auth/me), not GET /clinics — for
  // a practitioner that lists every active clinic, and the backend refuses
  // any clinic I don't belong to (403).
  const myClinics = currentUser?.clinics ?? []
  // With exactly one clinic there's no choice to make: it's filled in and
  // shown as plain text instead of a one-option dropdown.
  const onlyClinicId = myClinics.length === 1 ? String(myClinics[0].id) : ''

  const emptyForm: InvitePatientFormValues = {
    firstName: '',
    lastName: '',
    email: '',
    dateOfBirth: '',
    clinicId: onlyClinicId,
  }

  const form = useForm<InvitePatientFormValues>({
    resolver: zodResolver(invitePatientSchema),
    // Read ONCE, when the form is created (react-hook-form ignores later
    // changes to defaultValues) — which is what we want: the names from
    // the search are a starting point, not something kept in sync.
    defaultValues: {
      ...emptyForm,
      firstName: searchParams.get('firstName') ?? '',
      lastName: searchParams.get('lastName') ?? '',
    },
  })

  // The patient just invited. While set, the confirmation replaces the
  // form (the next step is going back to the roster, not a second
  // invitation — that's one click away, "Invite another patient").
  const [lastInvited, setLastInvited] = useState<CreatedUser | null>(null)

  const inviteMutation = useMutation({
    mutationFn: invitePatient,
    onSuccess: (patient) => {
      setLastInvited(patient)
      // Both lists now lack this patient (or, for the directory, would
      // still let me "add" them): mark every cached copy stale. Same two
      // prefixes as joining a care team (useJoinCareTeam).
      void queryClient.invalidateQueries({ queryKey: ['users-list'] })
      void queryClient.invalidateQueries({ queryKey: ['directory-patients'] })
    },
  })

  function inviteAnother() {
    setLastInvited(null)
    inviteMutation.reset()
    // Every field listed, on purpose — see CreateUserPage on why this
    // react-hook-form version only reliably clears the inputs it's given.
    // The names from the address bar are NOT reused: they belonged to the
    // previous patient.
    form.reset(emptyForm)
  }

  if (lastInvited) {
    return (
      <div className="mx-auto mt-8 max-w-sm space-y-4 px-4">
        <h1 className="text-xl font-semibold">Invite a new patient</h1>
        <InvitationSentNotice
          key={lastInvited.id}
          userId={lastInvited.id}
          invitation={lastInvited.invitation}
        >
          Invited {lastInvited.firstName} {lastInvited.lastName} ({lastInvited.email}). They're in
          your patients, and you're on their care team.
        </InvitationSentNotice>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/practitioner/patients">Go to my patients</Link>
          </Button>
          <Button type="button" variant="outline" onClick={inviteAnother}>
            Invite another patient
          </Button>
        </div>
      </div>
    )
  }

  const errors = form.formState.errors

  return (
    <div className="mx-auto mt-8 max-w-sm space-y-4 px-4">
      <div className="space-y-1">
        <Link
          to="/practitioner/patients/add"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Search your clinics
        </Link>
        <h1 className="text-xl font-semibold">Invite a new patient</h1>
        <p className="text-sm text-muted-foreground">
          They'll get an email to choose a password. You can add their phone number and address
          later, from their page.
        </p>
      </div>

      {myClinics.length === 0 ? (
        // Nothing the form could do: the backend requires one of MY
        // clinics. Say what's wrong and who can fix it, instead of a form
        // that can only fail.
        <p className="text-sm text-destructive">
          You don't belong to any clinic yet, so you can't invite patients. Ask an admin to add you
          to your clinic.
        </p>
      ) : (
        <form
          onSubmit={(e) => void form.handleSubmit((values) => inviteMutation.mutate(values))(e)}
          className="space-y-4"
          noValidate
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                autoComplete="off"
                aria-invalid={!!errors.firstName}
                {...form.register('firstName')}
              />
              {errors.firstName && (
                <p className="text-sm text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                autoComplete="off"
                aria-invalid={!!errors.lastName}
                {...form.register('lastName')}
              />
              {errors.lastName && (
                <p className="text-sm text-destructive">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            {/* autoComplete="off" on these fields: they describe the
                PATIENT, and the browser's suggestions would offer the
                practitioner's own name and address. */}
            <Input
              id="email"
              type="email"
              autoComplete="off"
              aria-invalid={!!errors.email}
              {...form.register('email')}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="dateOfBirth">Date of birth</Label>
            <Input
              id="dateOfBirth"
              type="date"
              aria-invalid={!!errors.dateOfBirth}
              {...form.register('dateOfBirth')}
            />
            {errors.dateOfBirth && (
              <p className="text-sm text-destructive">{errors.dateOfBirth.message}</p>
            )}
          </div>

          {myClinics.length === 1 ? (
            // One clinic: already in the form's values (onlyClinicId); just
            // say which.
            <p className="text-sm">
              <span className="text-muted-foreground">Clinic: </span>
              {myClinics[0].name}
            </p>
          ) : (
            <div className="space-y-1">
              <Label htmlFor="clinicId">Clinic</Label>
              <Controller
                control={form.control}
                name="clinicId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    // See ignoreEmptySelection: "Invite another patient"
                    // resets this field, and Radix echoes that reset as an
                    // empty "choice".
                    onValueChange={ignoreEmptySelection(field.onChange)}
                  >
                    <SelectTrigger id="clinicId" className="w-full">
                      <SelectValue placeholder="Select a clinic" />
                    </SelectTrigger>
                    <SelectContent>
                      {myClinics.map((clinic) => (
                        <SelectItem key={clinic.id} value={String(clinic.id)}>
                          {clinic.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.clinicId && (
                <p className="text-sm text-destructive">{errors.clinicId.message}</p>
              )}
            </div>
          )}

          {inviteMutation.isError && (
            <p className="text-sm text-destructive">{inviteErrorMessage(inviteMutation.error)}</p>
          )}

          <Button type="submit" className="w-full" disabled={inviteMutation.isPending}>
            {inviteMutation.isPending ? 'Inviting…' : 'Send invitation'}
          </Button>
        </form>
      )}
    </div>
  )
}

// What to say when the invitation fails. A 409 here means "an account with
// this email already exists" (the one uniqueness rule POST /users enforces
// for a patient). The backend's own sentence is right but leaves the
// practitioner stuck: the search didn't find this person, so their account
// is somewhere my directory can't see — another clinic, or deactivated —
// and only an admin can fix that (or the email is a typo). Say THAT.
// Every other error shows the backend's own words.
//
// Not exported: a component file that also exports plain functions breaks
// Vite's fast refresh (the react-refresh/only-export-components lint rule).
// The tests reach it through the page, which is how it's used anyway.
function inviteErrorMessage(error: Error): string {
  if (error instanceof ApiError && error.statusCode === 409) {
    return (
      'This email already belongs to a Stride account — perhaps at another clinic, or ' +
      'deactivated. Ask an admin to give you access (add the patient to your clinic, or ' +
      'reactivate the account), then add them from the search. Otherwise, check the email.'
    )
  }
  return error instanceof ApiError ? error.messages.join(', ') : 'Something went wrong'
}