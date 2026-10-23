import type { ReactNode } from 'react'
import { EditableField, ReadOnlyField } from '@/common/EditableField'
import { formatCalendarDate } from '@/common/formatCalendarDate'
import { requiredValue } from '@/common/requiredValue'
import { EditableTags } from '@/common/EditableTags'
import { EditableAddress } from '@/common/address/EditableAddress'
import { roleLabel } from '@/auth/roleLabel'
import { userRoleSchema } from '@/auth/schemas'
import { useSaveUser } from './useSaveUser'
import { EmailRow } from '@/email-change/EmailRow'
import { PasswordRow } from '@/password-change/PasswordRow'
import {
  bioSchema,
  firstNameSchema,
  lastNameSchema,
  phoneSchema,
  positionSchema,
  requiredDateOfBirthSchema,
  requiredLicenseNumberSchema,
  SPECIALTY_RULES,
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
  // The person's OWN profile (/profile): a "Sign-in and security" section
  // follows the personal details, with the Email row (it offers "Change" and
  // shows a change waiting for its confirmation) and the Password row.
  // Changing either is self-service only (decisions §12, §13), so the
  // admin's user page and the practitioner's patient page leave that section
  // out and show the address read-only among the personal details.
  ownProfile?: boolean
}

// The editable profile, shared by /profile and the admin's user page:
// personal details for everyone, then one section per role the account
// holds — ALL of them, not only the active one, because these fields
// belong to the person (decided in design decisions §4).
export function ProfileFields({ user, canEditLicense, ownProfile = false }: ProfileFieldsProps) {
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
          save={(value) => saveUser({ firstName: requiredValue(value) })}
        />
        <EditableField
          label="Last name"
          value={user.lastName}
          schema={lastNameSchema}
          save={(value) => saveUser({ lastName: requiredValue(value) })}
        />
        {/* Email is the sign-in name and the password-reset address, so it
            changes through its own flow with verification (decisions §12)
            — never as an inline edit, and only by the person: on their own
            profile it's in the sign-in section below. */}
        {!ownProfile && (
          <ReadOnlyField
            label="Email"
            value={user.email}
            note="Only the person can change their email address, from their own profile."
          />
        )}
        <EditableField
          label="Phone"
          value={user.phone}
          schema={phoneSchema}
          inputType="tel"
          save={(value) => saveUser({ phone: value })}
        />
        <EditableAddress address={user} save={(address) => saveUser(address)} />
      </ProfileSection>

      {/* How the person signs in (the person's choice, decisions §13): the
          two things that could hand the account to someone else, together —
          each changed on a page of its own, after the current password.
          Two-factor sign-in would join them. Own profile only. */}
      {ownProfile && (
        <ProfileSection title="Sign-in and security">
          <EmailRow email={user.email} />
          <PasswordRow />
        </ProfileSection>
      )}

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
                save={(value) => saveUser({ licenseNumber: requiredValue(value) })}
                readOnlyNote={
                  canEditLicense
                    ? undefined
                    : 'Only an admin can change this. Ask your clinic admin.'
                }
              />
              <EditableTags
                label="Specialties"
                values={user.practitionerProfile?.specialties ?? []}
                {...SPECIALTY_RULES}
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
              save={(value) => saveUser({ dateOfBirth: requiredValue(value) })}
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