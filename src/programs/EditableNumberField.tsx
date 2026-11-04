/*
    Copyright 2026 Julien Javelaud

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
// -----------------------------------------------------------------------------------------------------------

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Check, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { failureText } from '@/api/apiErrors'
import type { PrescriptionChanges } from '@/common/PrescriptionSummary'

interface EditableNumberFieldProps {
  // What saving means — the caller's job, not the field's (step 3b-1b): a
  // template's page sends PATCH /programs/…, a program's PATCH
  // /assigned-programs/…, and each writes its own cache entry. The field
  // only needs to know when that finished, and whether it failed — the
  // `save` prop of EditableField (src/common/), for the same reason.
  save: (changes: PrescriptionChanges) => Promise<unknown>
  fieldKey: 'sets' | 'reps' | 'durationInSeconds'
  label: string
  value: number | null
  // Appended when displaying a set value — "s" for duration ("45s"),
  // nothing for sets/reps.
  displaySuffix?: string
  // Same reasoning as EditableExerciseTitle's own canEdit — the pencil is
  // only rendered at all when the current user can actually modify this
  // template or program (a template: its owner, while not archived; a
  // program: while open), not just disabled, so a read-only view never
  // suggests editing is possible.
  canEdit: boolean
}

// Same overall click-to-edit shape as EditableExerciseListField/
// EditableExerciseTitle on the Library page (pencil icon, tick/x to
// confirm/cancel, one mutation instance per field, immediate save with
// no page-level Save button) — applied here to a single optional
// number instead of a string or an array of strings.
export function EditableNumberField({
  save,
  fieldKey,
  label,
  value,
  displaySuffix = '',
  canEdit,
}: EditableNumberFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState<number | undefined>(value ?? undefined)
  const [validationError, setValidationError] = useState<string | null>(null)

  // One mutation per field: its own pending state and error. onSuccess
  // in the mutation's OPTIONS (not a per-call mutate(…, { onSuccess })),
  // which runs even if the field unmounted meanwhile — EditableField's
  // reasoning.
  const updateMutation = useMutation({
    // null, not undefined, for "cleared" — see PrescriptionChanges.
    mutationFn: (newValue: number | null) => save({ [fieldKey]: newValue }),
    onSuccess: () => setIsEditing(false),
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
    // The draft uses undefined for "empty input" (convenient for the
    // input's value binding), but the REQUEST must say null: `?? null`
    // turns undefined into null and leaves any real number untouched —
    // a number is never null/undefined, so ?? never replaces it.
    updateMutation.mutate(draft ?? null)
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
          {failureText(updateMutation.error)}
        </p>
      )}
    </div>
  )
}