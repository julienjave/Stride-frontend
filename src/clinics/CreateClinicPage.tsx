import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AddressFields } from '@/common/address/AddressFields'
import { createClinic } from './api'
import { createClinicSchema, type CreateClinicFormValues } from './schemas'
import { ApiError } from '@/api/client'

export function CreateClinicPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const form = useForm<CreateClinicFormValues>({
    resolver: zodResolver(createClinicSchema),
  })
  const watchedCountry = form.watch('addressCountry')

  const createClinicMutation = useMutation({
    mutationFn: createClinic,
    onSuccess: (clinic) => {
      // Unlike auth's mutations — which setQueryData() directly, because
      // the backend hands back the ENTIRE new "who am I" state and
      // there's only ever ONE such cache entry to keep in sync — this is
      // a LIST resource. The thing that needs to become correct is the
      // cached array under clinicsListQueryKey, not a single object. Hand-
      // merging the new clinic into whatever's currently cached would
      // mean re-implementing findAll()'s own filtering/ordering rules
      // client-side just to guess at the right result. invalidateQueries
      // instead just marks both cached list variants (active-only and
      // include-inactive) stale via a prefix match on 'clinics-list' —
      // the next time either is read, TanStack Query transparently
      // refetches it, reflecting the server's real state rather than a
      // client-side guess. This is a distinct top-level key from
      // clinicQueryKey(id) (['clinics', id]) specifically so a prefix
      // match here can never also sweep up an unrelated already-cached
      // clinic detail entry — see useSaveClinic's identical
      // reasoning for the bug this design avoids.
      void queryClient.invalidateQueries({ queryKey: ['clinics-list'] })
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

        <AddressFields
          control={form.control}
          register={form.register}
          errors={form.formState.errors}
          watchedCountry={watchedCountry}
        />

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