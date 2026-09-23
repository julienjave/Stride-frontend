import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/api/client'
import { updateTemplate, programQueryKey } from './api'
import { upsertInProgramsList } from './programsListCache'
import { TEMPLATE_DESCRIPTION_MAX_LENGTH } from './schemas'

interface EditableTemplateDescriptionProps {
  templateId: number
  description: string | null
  canEdit: boolean
}

// Same click-to-edit shape as EditableNotesField (a multiline, optional
// text field), applied to the template's own description. The one real
// difference is how "empty" is saved — see confirm() below.
export function EditableTemplateDescription({
  templateId,
  description,
  canEdit,
}: EditableTemplateDescriptionProps) {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(description ?? '')
  const [validationError, setValidationError] = useState<string | null>(null)

  const updateMutation = useMutation({
    mutationFn: (newValue: string | null) =>
      updateTemplate(templateId, { description: newValue }),
    onSuccess: (updated) => {
      queryClient.setQueryData(programQueryKey(templateId), updated)
      // The hub doesn't display descriptions today, but the list cache
      // holds them — keeping it accurate costs nothing and means a future
      // screen reading it won't show a stale one.
      upsertInProgramsList(queryClient, updated)
      setIsEditing(false)
    },
  })

  function startEditing() {
    setDraft(description ?? '')
    setValidationError(null)
    setIsEditing(true)
  }

  function cancel() {
    setIsEditing(false)
    setValidationError(null)
  }

  function confirm() {
    const trimmed = draft.trim()
    if (trimmed.length > TEMPLATE_DESCRIPTION_MAX_LENGTH) {
      setValidationError(
        `Description must be ${TEMPLATE_DESCRIPTION_MAX_LENGTH} characters or fewer`,
      )
      return
    }
    // Empty (or whitespace-only) means "no description" — saved as null,
    // not "". Two reasons: a template created without a description
    // already has null, so clearing one should land in that same state
    // rather than a second, different "empty"; and null is the only way
    // to express "clear it" over the wire at all (see
    // UpdateTemplatePayload's comment on why undefined can't).
    updateMutation.mutate(trimmed.length === 0 ? null : trimmed)
  }

  if (!isEditing) {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Description</p>
          {canEdit && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Edit description"
              onClick={startEditing}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="whitespace-pre-wrap text-sm">
          {description && description.length > 0
            ? description
            : 'No description'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">Description</p>
      <textarea
        autoFocus
        aria-label="Description"
        aria-invalid={!!validationError}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value)
          setValidationError(null)
        }}
        disabled={updateMutation.isPending}
        className="min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="icon"
          aria-label="Save description"
          onClick={confirm}
          disabled={updateMutation.isPending}
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Cancel editing description"
          onClick={cancel}
          disabled={updateMutation.isPending}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      {validationError && (
        <p className="text-sm text-destructive">{validationError}</p>
      )}
      {updateMutation.isError && (
        <p className="text-sm text-destructive">
          {updateMutation.error instanceof ApiError
            ? updateMutation.error.messages.join(', ')
            : 'Something went wrong'}
        </p>
      )}
    </div>
  )
}