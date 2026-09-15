import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClinic, clinicsQueryKey } from './api'
import { createClinicSchema, type CreateClinicFormValues } from './schemas'
import { ApiError } from '@/api/client'

export function CreateClinicPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const form = useForm<CreateClinicFormValues>({
    resolver: zodResolver(createClinicSchema),
  })

  const createClinicMutation = useMutation({
    mutationFn: createClinic,
    onSuccess: (clinic) => {
      // Unlike auth's mutations — which setQueryData() directly, because
      // the backend hands back the ENTIRE new "who am I" state and
      // there's only ever ONE such cache entry to keep in sync — this is
      // a LIST resource. The thing that needs to become correct is the
      // cached array under clinicsQueryKey, not a single object. Hand-
      // merging the new clinic into whatever's currently cached would
      // mean re-implementing findAll()'s own filtering/ordering rules
      // client-side just to guess at the right result. invalidateQueries
      // instead just marks the list stale; the next time anything reads
      // clinicsQueryKey (e.g. navigating back to the list page), TanStack
      // Query transparently refetches it — the list ends up reflecting
      // the server's real state, not a client-side guess at it.
      // exact: true — see EditableClinicField's identical comment for why
      // this matters: without it, invalidating clinicsQueryKey
      // (['clinics']) also invalidates every already-cached
      // ['clinics', id] detail query, which is unrelated to "a new clinic
      // was created" and would trigger unnecessary background refetches
      // of every clinic anyone has viewed this session.
      void queryClient.invalidateQueries({ queryKey: clinicsQueryKey, exact: true })
      // Landing on the new clinic's own page, not back on the list —
      // someone who just created a clinic is very likely about to fill in
      // the optional fields they left blank, and this saves them finding
      // it in the list again immediately after.
      void navigate(`/admin/clinics/${clinic.id}`)
    },
  })

  return (
    <div className="mx-auto mt-12 max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">Add a clinic</h1>
      <form
        onSubmit={(e) =>
          void form.handleSubmit((values) => createClinicMutation.mutate(values))(e)
        }
        className="space-y-4"
        noValidate
      >
        <div className="space-y-1">
          <Label htmlFor="name">Clinic name</Label>
          <Input
            id="name"
            autoComplete="organization"
            aria-invalid={!!form.formState.errors.name}
            {...form.register('name')}
          />
          {form.formState.errors.name && (
            <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="email">Clinic email</Label>
          <Input
            id="email"
            type="email"
            aria-invalid={!!form.formState.errors.email}
            {...form.register('email')}
          />
          {form.formState.errors.email && (
            <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              aria-invalid={!!form.formState.errors.phone}
              {...form.register('phone')}
            />
            {form.formState.errors.phone && (
              <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="website">Website (optional)</Label>
            <Input
              id="website"
              type="url"
              autoComplete="url"
              aria-invalid={!!form.formState.errors.website}
              {...form.register('website')}
            />
            {form.formState.errors.website && (
              <p className="text-sm text-destructive">
                {form.formState.errors.website.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="address">Address (optional)</Label>
          <Input
            id="address"
            autoComplete="street-address"
            aria-invalid={!!form.formState.errors.address}
            {...form.register('address')}
          />
          {form.formState.errors.address && (
            <p className="text-sm text-destructive">{form.formState.errors.address.message}</p>
          )}
        </div>

        {createClinicMutation.isError && (
          <p className="text-sm text-destructive">
            {createClinicMutation.error instanceof ApiError
              ? createClinicMutation.error.messages.join(', ')
              : 'Something went wrong'}
          </p>
        )}

        <Button type="submit" disabled={createClinicMutation.isPending}>
          {createClinicMutation.isPending ? 'Creating…' : 'Create clinic'}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        <Link to="/admin/clinics" className="underline">
          Back to clinics
        </Link>
      </p>
    </div>
  )
}