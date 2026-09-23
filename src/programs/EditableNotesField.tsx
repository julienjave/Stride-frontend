import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/api/client'
import { updateTemplateExercise, programQueryKey } from './api'

interface EditableNotesFieldProps {
  templateId: number
  templateExerciseId: number
  notes: string | null
  // Same reasoning as EditableExerciseTitle's own canEdit — the pencil is
  // only rendered at all when the current user can actually modify this
  // template (its owner, and only while it isn't archived), not just
  // disabled, so a read-only view never suggests editing is possible.
  canEdit: boolean
}

// Same click-to-edit shape as the other editable fields on this page —
// a multiline optional text field, mirroring AddTemplateExerciseDto's
// own notes constraint (max 2000 characters).
export function EditableNotesField({
  templateId,
  templateExerciseId,
  notes,
  canEdit,
}: EditableNotesFieldProps) {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(notes ?? '')
  const [validationError, setValidationError] = useState<string | null>(null)

  const updateMutation = useMutation({
    mutationFn: (newValue: string) =>
      updateTemplateExercise(templateId, templateExerciseId, {
        notes: newValue,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(programQueryKey(templateId), updated)
      setIsEditing(false)
    },
  })

  function startEditing() {
    setDraft(notes ?? '')
    setValidationError(null)
    setIsEditing(true)
  }

  function cancel() {
    setIsEditing(false)
    setValidationError(null)
  }

  function confirm() {
    if (draft.length > 2000) {
      setValidationError('Notes must be 2000 characters or fewer')
      return
    }
    updateMutation.mutate(draft)
  }

  if (!isEditing) {
    return (
      <div className="py-2">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Notes</p>
          {canEdit && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Edit Notes"
              onClick={startEditing}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="whitespace-pre-wrap text-sm">
          {notes && notes.length > 0 ? notes : 'Not set'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2 py-2">
      <p className="text-sm text-muted-foreground">Notes</p>
      <textarea
        aria-label="Notes"
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
          aria-label="Save Notes"
          onClick={confirm}
          disabled={updateMutation.isPending}
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Cancel editing Notes"
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