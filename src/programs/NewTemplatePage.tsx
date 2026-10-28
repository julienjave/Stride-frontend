import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { failureText } from '@/api/apiErrors'
import { createTemplate } from './api'
import { upsertInProgramsList } from './programsListCache'
import { createTemplateSchema, type CreateTemplateFormValues } from './schemas'

// Title/description only. Submitting creates the template for real (it
// exists, with a real id, the moment this succeeds) and goes straight to
// that template's own page, where exercises are added. There used to be
// a separate "Screen 2" for adding exercises in between — it existed
// only because adding an exercise needs the template's id, and the
// template's own page has that id just as well.
export function NewTemplatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const form = useForm<CreateTemplateFormValues>({
    resolver: zodResolver(createTemplateSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  })

  const createTemplateMutation = useMutation({
    mutationFn: createTemplate,
    onSuccess: (template) => {
      // Without this, the Programs hub could keep showing its cached
      // list — WITHOUT the new template — for up to 30 seconds (the
      // app-wide staleTime) after landing back on it. Nothing refreshed
      // that list after a create before now.
      upsertInProgramsList(queryClient, template)
      // replace: the "New Program Template" form's history entry is
      // swapped for the new template's page. Browser Back from there
      // goes to the hub, not back to a blank creation form (where a
      // second submit would quietly create a second template).
      void navigate(`/practitioner/programs/templates/${template.id}`, {
        replace: true,
      })
    },
  })

  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-6 px-4">
      <h1 className="text-xl font-semibold">New Program Template</h1>

      <form
        onSubmit={(e) =>
          void form.handleSubmit((values) =>
            createTemplateMutation.mutate(values),
          )(e)
        }
        className="space-y-6"
        noValidate
      >
        <div className="space-y-1">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            aria-invalid={!!form.formState.errors.title}
            {...form.register('title')}
          />
          {form.formState.errors.title && (
            <p className="text-sm text-destructive">
              {form.formState.errors.title.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            aria-invalid={!!form.formState.errors.description}
            className="min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
            {...form.register('description')}
          />
          {form.formState.errors.description && (
            <p className="text-sm text-destructive">
              {form.formState.errors.description.message}
            </p>
          )}
        </div>

        {createTemplateMutation.isError && (
          <p className="text-sm text-destructive">
            {failureText(createTemplateMutation.error)}
          </p>
        )}

        <div className="flex items-center gap-4">
          <Button asChild variant="outline">
            <Link to="/practitioner/programs">Back</Link>
          </Button>
          <Button type="submit" disabled={createTemplateMutation.isPending}>
            {/* Says exactly what the button does. It used to read "Add
                Exercises" because it led to an exercises-only screen;
                it now lands on the template's own page. */}
            {createTemplateMutation.isPending ? 'Creating…' : 'Create Template'}
          </Button>
        </div>
      </form>
    </div>
  )
}