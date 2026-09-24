import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApiError } from '@/api/client'
import { updateTemplateExercise, programQueryKey } from './api'

interface EditableWeightFieldProps {
  templateId: number
  templateExerciseId: number
  weight: number | null
  weightUnit: 'kg' | 'lbs' | null
  // Same reasoning as EditableExerciseTitle's own canEdit — the pencil is
  // only rendered at all when the current user can actually modify this
  // template (its owner, and only while it isn't archived), not just
  // disabled, so a read-only view never suggests editing is possible.
  canEdit: boolean
}

// Same click-to-edit shape as EditableNumberField, but for the one
// PAIRED field on this page — weight and its unit are both-or-neither
// (see the backend's own hasStartedWeight), so this owns both values
// together in one edit session rather than being two separate fields
// that could end up saved independently and briefly inconsistent.
export function EditableWeightField({
  templateId,
  templateExerciseId,
  weight,
  weightUnit,
  canEdit,
}: EditableWeightFieldProps) {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [draftWeight, setDraftWeight] = useState<number | undefined>(
    weight ?? undefined,
  )
  const [draftUnit, setDraftUnit] = useState<'kg' | 'lbs' | undefined>(
    weightUnit ?? undefined,
  )
  const [validationError, setValidationError] = useState<string | null>(null)

  const updateMutation = useMutation({
    // null for "cleared" — see UpdateTemplateExercisePayload. Always sent
    // as a PAIR, both set or both null, matching hasStartedWeight.
    mutationFn: (payload: {
      weight: number | null
      weightUnit: 'kg' | 'lbs' | null
    }) => updateTemplateExercise(templateId, templateExerciseId, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(programQueryKey(templateId), updated)
      setIsEditing(false)
    },
  })

  function startEditing() {
    setDraftWeight(weight ?? undefined)
    setDraftUnit(weightUnit ?? undefined)
    setValidationError(null)
    setIsEditing(true)
  }

  function cancel() {
    setIsEditing(false)
    setValidationError(null)
  }

  function confirm() {
    const hasWeight = draftWeight !== undefined
    const hasUnit = draftUnit !== undefined
    // Mirrors the backend's hasStartedWeight rule exactly — both
    // together, or neither, never one alone.
    if (hasWeight && !hasUnit) {
      setValidationError('Select a unit for the weight')
      return
    }
    if (hasUnit && !hasWeight) {
      setValidationError('Enter a weight for the selected unit')
      return
    }
    if (hasWeight && draftWeight < 0) {
      setValidationError('Weight cannot be negative')
      return
    }
    updateMutation.mutate({
      weight: draftWeight ?? null,
      weightUnit: draftUnit ?? null,
    })
  }

  // The unit toggle can select kg or lbs but never "no unit" — so once a
  // weight exists, emptying the number input alone just triggers the
  // "Enter a weight for the selected unit" error, and there was no way to
  // clear a weight from the UI at all. This is the explicit way to do it:
  // one action that clears both halves together, which is the only kind
  // of clearing the backend accepts anyway. An explicit button rather
  // than "click the selected unit again to unselect it," because that
  // second behavior isn't something a person would ever guess.
  function removeWeight() {
    updateMutation.mutate({ weight: null, weightUnit: null })
  }

  if (!isEditing) {
    return (
      <div className="flex items-center justify-between py-2">
        <div>
          <p className="text-sm text-muted-foreground">Weight</p>
          <p>
            {weight != null && weightUnit
              ? `${weight} ${weightUnit}`
              : 'Not set'}
          </p>
        </div>
        {canEdit && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Edit Weight"
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
      <p className="text-sm text-muted-foreground">Weight</p>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          step="0.01"
          aria-label="Weight"
          value={draftWeight ?? ''}
          onChange={(e) => {
            setDraftWeight(
              e.target.value === '' ? undefined : Number(e.target.value),
            )
            setValidationError(null)
          }}
          disabled={updateMutation.isPending}
          className="flex-1"
        />
        <div className="flex overflow-hidden rounded-md border">
          {(['kg', 'lbs'] as const).map((unit) => (
            <button
              key={unit}
              type="button"
              aria-pressed={draftUnit === unit}
              onClick={() => {
                setDraftUnit(unit)
                setValidationError(null)
              }}
              disabled={updateMutation.isPending}
              className={
                draftUnit === unit
                  ? 'bg-primary px-3 text-sm text-primary-foreground'
                  : 'px-3 text-sm text-muted-foreground hover:bg-muted'
              }
            >
              {unit}
            </button>
          ))}
        </div>
        <Button
          type="button"
          size="icon"
          aria-label="Save Weight"
          onClick={confirm}
          disabled={updateMutation.isPending}
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Cancel editing Weight"
          onClick={cancel}
          disabled={updateMutation.isPending}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      {/* Only offered when there's a SAVED weight to remove — on an
          unset field there's nothing to clear. */}
      {weight != null && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={removeWeight}
          disabled={updateMutation.isPending}
        >
          Remove weight
        </Button>
      )}
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