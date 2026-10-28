import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { failureText } from '@/api/apiErrors'
import { duplicateTemplate, programQueryKey } from './api'
import { upsertInProgramsList } from './programsListCache'

interface DuplicateTemplateButtonProps {
  templateId: number
}

// Offered on every live template the practitioner can see, their own or
// a colleague's — for someone else's template, duplicating is the only
// way to build on it, since the original is read-only to them. No
// confirmation dialog: duplicating creates something new and changes
// nothing that already exists, so there's nothing to confirm.
export function DuplicateTemplateButton({
  templateId,
}: DuplicateTemplateButtonProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const duplicateMutation = useMutation({
    mutationFn: () => duplicateTemplate(templateId),
    onSuccess: (copy) => {
      // Seed the NEW template's own cache entry (copy.id — not
      // templateId, which is the source) with the full response. The page
      // navigated to below then renders instantly from cache, instead of
      // showing "Loading…" while it fetches something we already have.
      queryClient.setQueryData(programQueryKey(copy.id), copy)
      upsertInProgramsList(queryClient, copy)
      // Push, not replace (unlike archiving): the source template still
      // exists and is a perfectly sensible place for Back to return to.
      void navigate(`/practitioner/programs/templates/${copy.id}`)
    },
  })

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="outline"
        onClick={() => duplicateMutation.mutate()}
        disabled={duplicateMutation.isPending}
      >
        {duplicateMutation.isPending ? 'Duplicating…' : 'Duplicate'}
      </Button>
      {duplicateMutation.isError && (
        <p className="text-sm text-destructive">
          {failureText(duplicateMutation.error)}
        </p>
      )}
    </div>
  )
}