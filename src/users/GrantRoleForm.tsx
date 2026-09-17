import { useForm, Controller } from 'react-hook-form'
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
import { ApiError } from '@/api/client'
import { grantRole, userQueryKey } from './api'
import { grantRoleSchema, type GrantRoleFormValues } from './schemas'

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
  const form = useForm<GrantRoleFormValues>({
    resolver: zodResolver(grantRoleSchema),
    defaultValues: { role: availableRoles[0].value },
    // Same reasoning as CreateUserPage: without this, a field's value
    // from a role that's no longer selected (e.g. dateOfBirth, typed
    // while "patient" was picked) survives internally after its input
    // unmounts, and can silently fail validation on a field that isn't
    // even visible anymore.
    shouldUnregister: true,
  })
  const role = form.watch('role')

  const grantRoleMutation = useMutation({
    mutationFn: (values: GrantRoleFormValues) => grantRole(userId, values),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: userQueryKey(userId), exact: true }),
  })

  return (
    <form
      onSubmit={(e) =>
        void form.handleSubmit((values) => grantRoleMutation.mutate(values))(e)
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
            <Label htmlFor="grant-specialties">Specialties (optional, comma-separated)</Label>
            <Input id="grant-specialties" {...form.register('specialties')} />
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

      {grantRoleMutation.isError && (
        <p className="text-sm text-destructive">
          {grantRoleMutation.error instanceof ApiError
            ? grantRoleMutation.error.messages.join(', ')
            : 'Could not grant that role.'}
        </p>
      )}

      <Button type="submit" size="sm" disabled={grantRoleMutation.isPending}>
        {grantRoleMutation.isPending ? 'Granting…' : 'Grant role'}
      </Button>
    </form>
  )
}