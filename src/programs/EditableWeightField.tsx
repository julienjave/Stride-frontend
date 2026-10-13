import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Check, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApiError } from '@/api/client'
import { usePreferredWeightUnit } from '@/auth/usePreferredWeightUnit'
import { WeightValue } from '@/common/WeightValue'
import type { WeightUnit } from '@/common/weight'
import type { PrescriptionChanges } from '@/common/PrescriptionSummary'

interface EditableWeightFieldProps {
  // What saving means — the page's job (see EditableNumberField).
  save: (changes: PrescriptionChanges) => Promise<unknown>
  weight: number | null
  weightUnit: WeightUnit | null
  // Same reasoning as EditableExerciseTitle's own canEdit — the pencil is
  // only rendered at all when the current user can actually modify this
  // template or program (see EditableNumberField), not just disabled, so a
  // read-only view never suggests editing is possible.
  canEdit: boolean
}

// Same click-to-edit shape as EditableNumberField, but for the one
// PAIRED field on this page — weight and its unit are both-or-neither
// (see the backend's own hasStartedWeight), so this owns both values
// together in one edit session rather than being two separate fields
// that could end up saved independently and briefly inconsistent.
export function EditableWeightField({
  save,
  weight,
  weightUnit,
  canEdit,
}: EditableWeightFieldProps) {
  const preferredWeightUnit = usePreferredWeightUnit()
  const [isEditing, setIsEditing] = useState(false)
  const [draftWeight, setDraftWeight] = useState<number | undefined>(
    weight ?? undefined,
  )
  // Always a unit, never "none": the saved one when there's a weight,
  // otherwise the user's preferred unit, pre-selected. The toggle below
  // can't be unselected anyway — an empty weight box is what "no weight"
  // looks like (see confirm()).
  const [draftUnit, setDraftUnit] = useState<WeightUnit>(
    weightUnit ?? preferredWeightUnit,
  )
  const [validationError, setValidationError] = useState<string | null>(null)

  const updateMutation = useMutation({
    // null for "cleared" — see PrescriptionChanges. Always sent as a PAIR,
    // both set or both null, matching hasStartedWeight.
    mutationFn: (payload: {
      weight: number | null
      weightUnit: WeightUnit | null
    }) => save(payload),
    onSuccess: () => setIsEditing(false),
  })

  // The edit box always starts from the STORED weight in its STORED unit —
  // never the converted value the view may be showing. Otherwise a
  // practitioner who prefers kg could open "45 lbs", see "20.4 kg", press
  // Save without touching anything, and silently rewrite the
  // prescription. Conversion is for reading only.
  function startEditing() {
    setDraftWeight(weight ?? undefined)
    setDraftUnit(weightUnit ?? preferredWeightUnit)
    setValidationError(null)
    setIsEditing(true)
  }

  function cancel() {
    setIsEditing(false)
    setValidationError(null)
  }

  function confirm() {
    // An empty weight box. The unit always has a value (pre-selected), so
    // it can't be what decides "is there a weight" — the number does.
    if (draftWeight === undefined) {
      if (weight == null) {
        // Nothing saved, nothing entered: nothing to do. Close without a
        // request, like every other editor when nothing changed.
        setIsEditing(false)
        return
      }
      // A saved weight whose box was emptied. Clearing a prescription is
      // deliberate enough to get its own explicit button, so an emptied
      // box is pointed at it rather than silently treated as "remove".
      setValidationError('Enter a weight, or use "Remove weight" to clear it')
      return
    }
    if (draftWeight < 0) {
      setValidationError('Weight cannot be negative')
      return
    }
    // Always a PAIR — the backend's hasStartedWeight rule.
    updateMutation.mutate({ weight: draftWeight, weightUnit: draftUnit })
  }

  // The unit toggle can select kg or lbs but never "no unit", and an
  // emptied weight box is refused (see confirm()) — so this is the one
  // way to clear a weight from the UI:
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
            {/* Shown in the VIEWER's preferred unit, with the prescribed
                value alongside when that means converting. */}
            {weight != null && weightUnit ? (
              <WeightValue weight={weight} unit={weightUnit} />
            ) : (
              'Not set'
            )}
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