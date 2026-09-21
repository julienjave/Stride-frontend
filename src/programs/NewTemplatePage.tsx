import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/api/client'
import { createTemplate } from './api'
import { createTemplateSchema, type CreateTemplateFormValues } from './schemas'

// Screen 1 of 2 in the template creation flow — title/description only.
// "Next" creates the template for real (it already exists, with a real
// id, the moment this succeeds) and redirects to Screen 2 for adding
// exercises, mirroring the exact same two-screen shape already
// established for exercise creation -> photo management.
export function NewTemplatePage() {
  const navigate = useNavigate()

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
      void navigate(`/practitioner/programs/templates/${template.id}/exercises`)
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
            {createTemplateMutation.error instanceof ApiError
              ? createTemplateMutation.error.messages.join(', ')
              : 'Something went wrong'}
          </p>
        )}

        <div className="flex items-center gap-4">
          <Button asChild variant="outline">
            <Link to="/practitioner/programs">Back</Link>
          </Button>
          <Button type="submit" disabled={createTemplateMutation.isPending}>
            {createTemplateMutation.isPending ? 'Creating…' : 'Add Exercises'}
          </Button>
        </div>
      </form>
    </div>
  )
}