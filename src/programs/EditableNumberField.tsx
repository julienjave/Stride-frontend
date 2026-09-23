import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApiError } from '@/api/client'
import { updateTemplateExercise, programQueryKey } from './api'

interface EditableNumberFieldProps {
  templateId: number
  templateExerciseId: number
  fieldKey: 'sets' | 'reps' | 'durationInSeconds'
  label: string
  value: number | null
  // Appended when displaying a set value — "s" for duration ("45s"),
  // nothing for sets/reps.
  displaySuffix?: string
  // Same reasoning as EditableExerciseTitle's own canEdit — the pencil is
  // only rendered at all when the current user can actually modify this
  // template (its owner, and only while it isn't archived), not just
  // disabled, so a read-only view never suggests editing is possible.
  canEdit: boolean
}

// Same overall click-to-edit shape as EditableExerciseListField/
// EditableExerciseTitle on the Library page (pencil icon, tick/x to
// confirm/cancel, one mutation instance per field, immediate save with
// no page-level Save button) — applied here to a single optional
// number instead of a string or an array of strings.
export function EditableNumberField({
  templateId,
  templateExerciseId,
  fieldKey,
  label,
  value,
  displaySuffix = '',
  canEdit,
}: EditableNumberFieldProps) {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState<number | undefined>(value ?? undefined)
  const [validationError, setValidationError] = useState<string | null>(null)

  const updateMutation = useMutation({
    mutationFn: (newValue: number | undefined) =>
      updateTemplateExercise(templateId, templateExerciseId, {
        [fieldKey]: newValue,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(programQueryKey(templateId), updated)
      setIsEditing(false)
    },
  })

  function startEditing() {
    setDraft(value ?? undefined)
    setValidationError(null)
    setIsEditing(true)
  }

  function cancel() {
    setIsEditing(false)
    setValidationError(null)
  }

  function confirm() {
    // Clearing the field entirely is valid — draft undefined means "no
    // longer set," matching the backend's own optional treatment of
    // these fields. Only a PROVIDED value needs to satisfy the real
    // constraint (a positive whole number), mirroring
    // AddTemplateExerciseDto's own @IsInt() @Min(1).
    if (draft !== undefined && (!Number.isInteger(draft) || draft < 1)) {
      setValidationError(`${label} must be a positive whole number`)
      return
    }
    updateMutation.mutate(draft)
  }

  if (!isEditing) {
    return (
      <div className="flex items-center justify-between py-2">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p>{value != null ? `${value}${displaySuffix}` : 'Not set'}</p>
        </div>
        {canEdit && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Edit ${label}`}
            onClick={startEditing}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-1 py-2">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          step="1"
          aria-label={label}
          value={draft ?? ''}
          onChange={(e) => {
            setDraft(e.target.value === '' ? undefined : Number(e.target.value))
            setValidationError(null)
          }}
          disabled={updateMutation.isPending}
        />
        <Button
          type="button"
          size="icon"
          aria-label={`Save ${label}`}
          onClick={confirm}
          disabled={updateMutation.isPending}
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Cancel editing ${label}`}
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