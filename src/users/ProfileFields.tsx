import type { ReactNode } from 'react'
import { EditableField, ReadOnlyField } from '@/common/EditableField'
import { formatCalendarDate } from '@/common/formatCalendarDate'
import { EditableTags } from '@/common/EditableTags'
import { EditableAddress } from '@/common/address/EditableAddress'
import { roleLabel } from '@/auth/roleLabel'
import { userRoleSchema } from '@/auth/schemas'
import { useSaveUser } from './useSaveUser'
import {
  bioSchema,
  firstNameSchema,
  lastNameSchema,
  MAX_SPECIALTIES,
  phoneSchema,
  positionSchema,
  requiredDateOfBirthSchema,
  requiredLicenseNumberSchema,
  specialtySchema,
} from './schemas'
import type { User } from './types'

interface ProfileFieldsProps {
  // The user being SHOWN and edited — the logged-in user on /profile, or
  // any user on the admin's user page. The component never assumes "me".
  user: User
  // The one field-level permission (design decisions §4): only an admin
  // may change a license number. The PAGE decides this, since only it
  // knows who is looking; the backend enforces it regardless (403).
  canEditLicense: boolean
}

// The editable profile, shared by /profile and the admin's user page:
// personal details for everyone, then one section per role the account
// holds — ALL of them, not only the active one, because these fields
// belong to the person (decided in design decisions §4).
export function ProfileFields({ user, canEditLicense }: ProfileFieldsProps) {
  const saveUser = useSaveUser(user.id)

  // Walking the canonical role list (admin, practitioner, patient) and
  // keeping the ones this account holds — the same technique as
  // RoleSwitcher: sections always appear in the same order, however the
  // backend orders `roles`.
  const heldRoles = userRoleSchema.options.filter((role) => user.roles.includes(role))

  return (
    <div className="space-y-6">
      <ProfileSection title="Personal details">
        <EditableField
          label="First name"
          value={user.firstName}
          schema={firstNameSchema}
          save={(value) => saveUser({ firstName: required(value) })}
        />
        <EditableField
          label="Last name"
          value={user.lastName}
          schema={lastNameSchema}
          save={(value) => saveUser({ lastName: required(value) })}
        />
        {/* Read-only by decision (§4): email is also the login name and
            the password-reset address, so changing it gets its own flow
            with verification — a later roadmap item. */}
        <ReadOnlyField
          label="Email"
          value={user.email}
          note="Changing an email address isn't available yet."
        />
        <EditableField
          label="Phone"
          value={user.phone}
          schema={phoneSchema}
          inputType="tel"
          save={(value) => saveUser({ phone: value })}
        />
        <EditableAddress address={user} save={(address) => saveUser(address)} />
      </ProfileSection>

      {heldRoles.map((role) => (
        <ProfileSection key={role} title={`${roleLabel(role)} details`}>
          {role === 'admin' && (
            <EditableField
              label="Position"
              value={user.adminProfile?.position ?? null}
              schema={positionSchema}
              save={(value) => saveUser({ position: value })}
            />
          )}

          {role === 'practitioner' && (
            <>
              <EditableField
                label="License number"
                value={user.practitionerProfile?.licenseNumber ?? null}
                schema={requiredLicenseNumberSchema}
                save={(value) => saveUser({ licenseNumber: required(value) })}
                readOnlyNote={
                  canEditLicense
                    ? undefined
                    : 'Only an admin can change this. Ask your clinic admin.'
                }
              />
              <EditableTags
                label="Specialties"
                values={user.practitionerProfile?.specialties ?? []}
                itemSchema={specialtySchema}
                maxItems={MAX_SPECIALTIES}
                save={(specialties) => saveUser({ specialties })}
              />
              <EditableField
                label="Bio"
                value={user.practitionerProfile?.bio ?? null}
                schema={bioSchema}
                inputType="textarea"
                save={(value) => saveUser({ bio: value })}
              />
            </>
          )}

          {role === 'patient' && (
            <EditableField
              label="Date of birth"
              value={user.patientProfile?.dateOfBirth ?? null}
              schema={requiredDateOfBirthSchema}
              inputType="date"
              formatValue={formatCalendarDate}
              save={(value) => saveUser({ dateOfBirth: required(value) })}
            />
          )}
        </ProfileSection>
      ))}
    </div>
  )
}

// A titled card. <section> + aria-labelledby makes each one a named region
// ("Practitioner details") that screen-reader users can jump between —
// and that tests can target with getByRole('region', { name }).
function ProfileSection({ title, children }: { title: string; children: ReactNode }) {
  const headingId = `profile-section-${title.toLowerCase().replace(/\W+/g, '-')}`
  return (
    <section aria-labelledby={headingId} className="space-y-2">
      <h2 id={headingId} className="text-sm font-medium text-muted-foreground">
        {title}
      </h2>
      <div className="divide-y divide-border rounded-lg border px-4">{children}</div>
    </section>
  )
}

// For NOT NULL fields. EditableField hands every `save` a `string | null`,
// because in general a cleared field is null. These fields' schemas reject
// '' (so EditableField shows "… is required" and never gets as far as
// saving), which means null can't actually arrive here — but TypeScript
// can't know that: the guarantee lives in the schema, at runtime.
//
// Rather than hiding the gap with a cast (`value as string`), this makes
// the assumption explicit and LOUD: if it's ever broken (say, someone
// swaps in a schema that accepts ''), the save fails with a clear message
// instead of quietly sending null to the backend.
function required(value: string | null): string {
  if (value === null) {
    throw new Error('This field is required and cannot be cleared')
  }
  return value
}