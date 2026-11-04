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

import { useForm, useWatch, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import { failureText } from '@/api/apiErrors'
import { adminDuplicateMatches } from './possibleDuplicate'
import { PossibleDuplicatesNotice } from './PossibleDuplicatesNotice'
import { TagListField } from '@/common/TagListField'
import { grantRole, userQueryKey } from './api'
import {
  grantRoleSchema,
  SPECIALTY_RULES,
  type GrantRoleFormInput,
  type GrantRoleFormValues,
} from './schemas'

const ALL_ROLES: { value: 'patient' | 'practitioner' | 'admin'; label: string }[] = [
  { value: 'patient', label: 'Patient' },
  { value: 'practitioner', label: 'Practitioner' },
  { value: 'admin', label: 'Admin' },
]

interface GrantRoleFormProps {
  userId: number
  currentRoles: string[]
}

export function GrantRoleForm({ userId, currentRoles }: GrantRoleFormProps) {
  const availableRoles = ALL_ROLES.filter((role) => !currentRoles.includes(role.value))

  if (availableRoles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">This user already holds every role.</p>
    )
  }

  // Keyed by the current role set from the PARENT (UserEditPage, via
  // user.roles) — after a successful grant, that invalidates the user's
  // query, the parent re-renders with a NEW currentRoles, and this key
  // changing makes React remount GrantRoleFormView from scratch. That's
  // deliberately simpler than trying to hand-compute "whichever role
  // should be selected next" inside onSuccess: the form's own initial
  // state (which role defaults to selected) only needs to be right ONCE,
  // at mount, and a remount is the standard way to get a fresh "once" out
  // of a value that depends on a prop which changes over time.
  return (
    <GrantRoleFormView
      key={currentRoles.join(',')}
      userId={userId}
      availableRoles={availableRoles}
    />
  )
}

function GrantRoleFormView({
  userId,
  availableRoles,
}: {
  userId: number
  availableRoles: typeof ALL_ROLES
}) {
  const queryClient = useQueryClient()
  // Input vs submitted types — see CreateUserPage.
  const form = useForm<GrantRoleFormInput, unknown, GrantRoleFormValues>({
    resolver: zodResolver(grantRoleSchema),
    defaultValues: { role: availableRoles[0].value },
    // Same reasoning as CreateUserPage: without this, a field's value
    // from a role that's no longer selected (e.g. dateOfBirth, typed
    // while "patient" was picked) survives internally after its input
    // unmounts, and can silently fail validation on a field that isn't
    // even visible anymore.
    shouldUnregister: true,
  })
  // useWatch, not form.watch() — see CreateUserPage.
  const role = useWatch({ control: form.control, name: 'role' })

  const grantRoleMutation = useMutation({
    mutationFn: ({ values, allowPossibleDuplicate }: GrantRequest) =>
      grantRole(userId, values, allowPossibleDuplicate),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: userQueryKey(userId), exact: true }),
  })
  // Null unless the last answer was the possible-duplicate warning; then
  // the values that request sent.
  const duplicates = adminDuplicateMatches(grantRoleMutation.error)
  const warnedAbout = grantRoleMutation.variables?.values

  return (
    <form
      onSubmit={(e) =>
        void form.handleSubmit((values) =>
          grantRoleMutation.mutate({ values, allowPossibleDuplicate: false }),
        )(e)
      }
      className="space-y-3"
      noValidate
    >
      <div className="space-y-1">
        <Label htmlFor="grant-role">Grant role</Label>
        <Controller
          control={form.control}
          name="role"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="grant-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((availableRole) => (
                  <SelectItem key={availableRole.value} value={availableRole.value}>
                    {availableRole.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {role === 'practitioner' && (
        <>
          <div className="space-y-1">
            <Label htmlFor="grant-licenseNumber">License number</Label>
            <Input
              id="grant-licenseNumber"
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
            <Label htmlFor="grant-specialties">Specialties (optional)</Label>
            {/* Same wiring as CreateUserPage's specialties. */}
            <Controller
              control={form.control}
              name="specialties"
              render={({ field, fieldState }) => (
                <TagListField
                  id="grant-specialties"
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                  {...SPECIALTY_RULES}
                />
              )}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="grant-bio">Bio (optional)</Label>
            <Input id="grant-bio" {...form.register('bio')} />
          </div>
        </>
      )}

      {role === 'patient' && (
        <div className="space-y-1">
          <Label htmlFor="grant-dateOfBirth">Date of birth</Label>
          <Input
            id="grant-dateOfBirth"
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
          <Label htmlFor="grant-position">Position (optional)</Label>
          <Input id="grant-position" {...form.register('position')} />
        </div>
      )}

      {duplicates && warnedAbout ? (
        // Granting the patient role makes a new patient record: the same
        // possible-duplicate warning as creating one (decisions §27).
        <PossibleDuplicatesNotice
          key={grantRoleMutation.submittedAt}
          matches={duplicates}
          goAheadLabel="Grant the patient role anyway"
          goingAhead={grantRoleMutation.isPending}
          onGoAhead={() =>
            grantRoleMutation.mutate({ values: warnedAbout, allowPossibleDuplicate: true })
          }
        />
      ) : (
        grantRoleMutation.isError && (
          <p className="text-sm text-destructive">
            {failureText(grantRoleMutation.error, 'Could not grant that role.')}
          </p>
        )
      )}

      <Button type="submit" size="sm" disabled={grantRoleMutation.isPending}>
        {grantRoleMutation.isPending ? 'Granting…' : 'Grant role'}
      </Button>
    </form>
  )
}

interface GrantRequest {
  values: GrantRoleFormValues
  allowPossibleDuplicate: boolean
}