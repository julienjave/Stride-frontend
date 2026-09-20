import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApiError } from '@/api/client'
import { updateExercise, exerciseQueryKey } from './api'
import { validateStringListField } from './schemas'
import type { UpdateExercisePayload } from './api'

interface EditableExerciseListFieldProps {
  exerciseId: number
  fieldKey: keyof UpdateExercisePayload
  label: string
  addButtonLabel: string
  values: string[]
  canEdit: boolean
  multiline?: boolean
  itemMaxLength: number
  minCount?: number
  maxCount: number
  // Used in validation messages ("at least one X is required") — a
  // human-readable singular noun for one entry in this specific field.
  itemLabel: string
}

// The array-field counterpart to EditableExerciseTitle — same overall
// click-to-edit shape (pencil icon, tick/x to confirm/cancel, one
// mutation instance per field), but for primaryMuscles/secondaryMuscles/
// equipment/instructions instead of a single string. Deliberately its
// own implementation rather than reusing the creation form's
// DynamicStringListField: that component is built around React Hook
// Form's useFieldArray, which expects a whole multi-field form context
// to live inside — spinning up a separate RHF form instance just to
// coordinate ONE field here would add real machinery for no benefit over
// plain useState, since there's no sibling field's validation to
// coordinate with. The visual row/add/delete shape is intentionally
// similar; the state management underneath is intentionally different.
export function EditableExerciseListField({
  exerciseId,
  fieldKey,
  label,
  addButtonLabel,
  values,
  canEdit,
  multiline = false,
  itemMaxLength,
  minCount,
  maxCount,
  itemLabel,
}: EditableExerciseListFieldProps) {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState<string[]>(values)
  const [validationError, setValidationError] = useState<string | null>(null)

  const updateMutation = useMutation({
    mutationFn: (newValues: string[]) =>
      updateExercise(exerciseId, { [fieldKey]: newValues }),
    onSuccess: (updated) => {
      queryClient.setQueryData(exerciseQueryKey(exerciseId), updated)
      // Muscles show up on the Library's own cards too (ExerciseCard) —
      // same list-invalidation reasoning as EditableExerciseTitle.
      void queryClient.invalidateQueries({ queryKey: ['exercises-list'] })
      setIsEditing(false)
    },
  })

  function startEditing() {
    setDraft(values)
    setValidationError(null)
    setIsEditing(true)
  }

  function cancel() {
    setIsEditing(false)
    setValidationError(null)
  }

  function updateRow(index: number, value: string) {
    setDraft((previous) =>
      previous.map((existing, i) => (i === index ? value : existing)),
    )
  }

  function addRow() {
    setDraft((previous) => [...previous, ''])
  }

  function removeRow(index: number) {
    // Every row can be removed during editing, even one that would drop
    // the array below its required minimum — unlike the CREATE form's
    // "first row can't be deleted" nicety, there's no single canonical
    // "first" row once an exercise already has an established list.
    // Confirm-time validation (below) is what actually catches an
    // invalid result, with a clear message, rather than a delete button
    // being mysteriously disabled on one particular row.
    setDraft((previous) => previous.filter((_, i) => i !== index))
  }

  function confirm() {
    const error = validateStringListField(draft, {
      itemMaxLength,
      minCount,
      maxCount,
      itemLabel,
    })
    if (error) {
      setValidationError(error)
      return
    }
    updateMutation.mutate(draft)
  }

  if (!isEditing) {
    return (
      <div className="py-2">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
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
        {values.length > 0 ? (
          <p>{values.join(', ')}</p>
        ) : (
          <p className="text-muted-foreground italic">None</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2 py-2">
      <p className="text-sm text-muted-foreground">{label}</p>

      {draft.map((value, index) => {
        const inputId = `${fieldKey}-edit-${index}`
        return (
          <div key={index} className="flex items-start gap-2">
            {multiline ? (
              <textarea
                id={inputId}
                aria-label={`${label} ${index + 1}`}
                value={value}
                onChange={(e) => updateRow(index, e.target.value)}
                disabled={updateMutation.isPending}
                className="min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            ) : (
              <Input
                id={inputId}
                aria-label={`${label} ${index + 1}`}
                value={value}
                onChange={(e) => updateRow(index, e.target.value)}
                disabled={updateMutation.isPending}
              />
            )}
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={`Delete ${label} ${index + 1}`}
              onClick={() => removeRow(index)}
              disabled={updateMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      })}

      {draft.length === 0 && (
        <p className="text-sm text-muted-foreground">None added yet.</p>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addRow}
        disabled={updateMutation.isPending}
      >
        + {addButtonLabel}
      </Button>

      <div className="flex items-center gap-2">
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