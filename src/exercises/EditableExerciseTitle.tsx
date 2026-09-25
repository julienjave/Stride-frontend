import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApiError } from '@/api/client'
import { updateExercise, exerciseQueryKey } from './api'

interface EditableExerciseTitleProps {
  exerciseId: number
  name: string
  // Same reasoning as ExerciseDetailPage's other editable fields — the
  // pencil icon is only rendered at all when the current user can
  // actually modify this exercise, not just disabled, so there's no
  // confusion about whether editing is possible for a shared/other
  // practitioner's exercise (see the design discussion).
  canEdit: boolean
}

// One field, styled as the page's main heading rather than a labeled row
// like EditableExerciseListField below it — name is the only scalar
// string field on this page, so this stays a dedicated component rather
// than a generic "editable text field" built for a case that doesn't
// exist here.
export function EditableExerciseTitle({
  exerciseId,
  name,
  canEdit,
}: EditableExerciseTitleProps) {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const [validationError, setValidationError] = useState<string | null>(null)

  const updateMutation = useMutation({
    mutationFn: (newName: string) =>
      updateExercise(exerciseId, { name: newName }),
    onSuccess: (updated) => {
      queryClient.setQueryData(exerciseQueryKey(exerciseId), updated)
      // The library's list cards also show the name — same "write the
      // detail cache directly, invalidate the list" split every other
      // editable field in this codebase already uses (useSaveClinic
      // has the identical reasoning, including why 'exercises-list' is a
      // safe prefix match: it's a distinct top-level key from
      // exerciseQueryKey(id), so this can never also invalidate the
      // entry setQueryData just wrote).
      void queryClient.invalidateQueries({ queryKey: ['exercises-list'] })
      setIsEditing(false)
    },
  })

  function startEditing() {
    setDraft(name)
    setValidationError(null)
    setIsEditing(true)
  }

  function cancel() {
    setIsEditing(false)
    setValidationError(null)
  }

  function confirm() {
    const trimmed = draft.trim()
    if (trimmed.length === 0) {
      setValidationError('Name is required')
      return
    }
    if (trimmed.length > 200) {
      setValidationError('Name must be 200 characters or fewer')
      return
    }
    updateMutation.mutate(trimmed)
  }

  if (!isEditing) {
    return (
      <div className="flex items-start gap-2">
        <h1 className="text-2xl font-semibold">{name}</h1>
        {canEdit && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Edit exercise name"
            onClick={startEditing}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Input
          autoFocus
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setValidationError(null)
          }}
          aria-label="Exercise name"
          aria-invalid={!!validationError}
          disabled={updateMutation.isPending}
          className="text-2xl font-semibold"
        />
        <Button
          type="button"
          size="icon"
          aria-label="Save name"
          onClick={confirm}
          disabled={updateMutation.isPending}
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Cancel editing name"
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