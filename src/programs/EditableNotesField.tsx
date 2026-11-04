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
import { failureText } from '@/api/apiErrors'
import type { PrescriptionChanges } from '@/common/PrescriptionSummary'

interface EditableNotesFieldProps {
  // What saving means — the page's job (see EditableNumberField).
  save: (changes: PrescriptionChanges) => Promise<unknown>
  notes: string | null
  // Same reasoning as EditableExerciseTitle's own canEdit — the pencil is
  // only rendered at all when the current user can actually modify this
  // template or program (see EditableNumberField), not just disabled, so a
  // read-only view never suggests editing is possible.
  canEdit: boolean
}

// Same click-to-edit shape as the other editable fields on this page —
// a multiline optional text field, mirroring AddTemplateExerciseDto's
// own notes constraint (max 2000 characters).
export function EditableNotesField({
  save,
  notes,
  canEdit,
}: EditableNotesFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(notes ?? '')
  const [validationError, setValidationError] = useState<string | null>(null)

  const updateMutation = useMutation({
    mutationFn: (newValue: string | null) => save({ notes: newValue }),
    onSuccess: () => setIsEditing(false),
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
    // Empty (or whitespace-only) is saved as null, not "" — the same
    // "no notes" state a row starts in when notes were never set, rather
    // than a second, different kind of empty. Same rule as the template
    // description editor.
    const trimmed = draft.trim()
    updateMutation.mutate(trimmed.length === 0 ? null : trimmed)
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
          {failureText(updateMutation.error)}
        </p>
      )}
    </div>
  )
}