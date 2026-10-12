import { useId, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApiError } from '@/api/client'
import { workoutLetter } from '@/common/workoutLabel'
import { WORKOUT_NAME_MAX_LENGTH, normalizeWorkoutName } from './workoutGroups'

interface WorkoutHeaderProps {
  // 0 for A… — the letter, which never changes while editing the name.
  position: number
  // The stored name (null = none). The label shown is letter + name.
  name: string | null
  label: string
  // The drag handle, drawn by the caller: only the caller knows whether the
  // workouts can be dragged at all, and it owns the sortable wiring.
  dragHandle?: ReactNode
  // Absent = no rename (a read-only view). Like EditableField's `save`: the
  // header doesn't know which resource it belongs to; it calls this and
  // waits for it.
  onRename?: (name: string | null) => Promise<unknown>
  // Absent = no Delete button. The caller passes it only when deleting
  // would succeed (isWorkoutRemovable), so the button never leads to a
  // refusal the screen could have predicted.
  onDelete?: () => void
  // Disables the Delete button (a write is on its way).
  disabled?: boolean
}

// One workout's heading: "A · Mobility", with its drag handle, a pencil to
// rename it, and a Delete button when it can be deleted. A component of its
// own — not part of the template list — because the program page (3b)
// shows the same header over a program's workouts.
export function WorkoutHeader({
  position,
  name,
  label,
  dragHandle,
  onRename,
  onDelete,
  disabled = false,
}: WorkoutHeaderProps) {
  const letter = workoutLetter(position)
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const inputId = useId()

  // This header's own mutation, so its pending state and its error belong
  // to it alone. `onSuccess` in the options (not in mutate()) — the rule
  // EditableField explains: per-call callbacks are skipped if the component
  // has unmounted meanwhile.
  const renameMutation = useMutation({
    mutationFn: (newName: string | null) => {
      // Unreachable without onRename (no pencil is drawn) — but if it ever
      // were reached, failing loudly beats pretending to save.
      if (!onRename) throw new Error('This workout cannot be renamed here')
      return onRename(newName)
    },
    onSuccess: () => setIsEditing(false),
  })

  function startEditing() {
    // The saved name, not an abandoned draft from an earlier Cancel.
    setDraft(name ?? '')
    setValidationError(null)
    renameMutation.reset()
    setIsEditing(true)
  }

  function cancel() {
    setIsEditing(false)
    setValidationError(null)
  }

  function save() {
    const newName = normalizeWorkoutName(draft)
    if (newName !== null && newName.length > WORKOUT_NAME_MAX_LENGTH) {
      setValidationError(
        `A workout name can be at most ${WORKOUT_NAME_MAX_LENGTH} characters`,
      )
      return
    }
    renameMutation.mutate(newName)
  }

  // Enter saves, Escape cancels — what people expect from an inline editor.
  // (No <form> around it: this header can sit inside other forms' pages,
  // and a nested <form> is invalid HTML.)
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      save()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      cancel()
    }
  }

  if (isEditing) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {/* The letter stays visible: it's not part of the name, and it
              tells the practitioner which workout they're naming. A <label>,
              so clicking it focuses the field; the field's spoken name is
              its aria-label, "Name of workout B" (a hidden "Name of workout "
              inside the label would depend on how each tool counts the
              space at its edge). */}
          <label htmlFor={inputId} className="shrink-0 font-medium">
            {letter}
          </label>
          <Input
            id={inputId}
            aria-label={`Name of workout ${letter}`}
            autoFocus
            value={draft}
            placeholder="No name"
            onChange={(event) => {
              setDraft(event.target.value)
              setValidationError(null)
            }}
            onKeyDown={handleKeyDown}
            aria-invalid={!!validationError}
            disabled={renameMutation.isPending}
          />
          <Button
            type="button"
            size="icon"
            aria-label={`Save the name of workout ${letter}`}
            onClick={save}
            disabled={renameMutation.isPending}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Cancel renaming workout ${letter}`}
            onClick={cancel}
            disabled={renameMutation.isPending}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Leave it empty for no name: the workout is then just "{letter}".
        </p>
        {validationError && (
          <p className="text-sm text-destructive">{validationError}</p>
        )}
        {renameMutation.isError && (
          <p role="alert" className="text-sm text-destructive">
            {renameMutation.error instanceof ApiError
              ? renameMutation.error.messages.join(' ')
              : "Couldn't rename the workout. Try again."}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      {dragHandle}
      <h3 className="min-w-0 flex-1 truncate font-medium">{label}</h3>
      {onRename && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Rename workout ${label}`}
          onClick={startEditing}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      {onDelete && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Delete workout ${label}`}
          onClick={onDelete}
          disabled={disabled}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}