import { type Ref, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Check, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { failureText } from '@/api/apiErrors'
import {
  EXERCISE_NAME_MAX_LENGTH,
  type ExerciseDescriptionChanges,
} from './descriptionRules'

interface EditableExerciseTitleProps {
  name: string
  // What saving means — the caller's job, not the field's (step D-3, as the
  // prescription fields did in 3b-1b): the library's page sends PATCH
  // /exercises/:id and writes the exercise's cache entry; a program's page
  // sends PATCH /assigned-programs/:id/exercises/:rowId and writes the
  // program's. The field only needs to know when that finished, and whether
  // it failed.
  save: (changes: ExerciseDescriptionChanges) => Promise<unknown>
  // Same reasoning as ExerciseDetailPage's other editable fields — the
  // pencil icon is only rendered at all when the current user can
  // actually modify this exercise, not just disabled, so there's no
  // confusion about whether editing is possible for a shared/other
  // practitioner's exercise (see the design discussion).
  canEdit: boolean
  // The library's page has the exercise as its title (h1); a program's page
  // has the PROGRAM as its title, the exercise below it (h2). Headings say
  // how a page is organised — screen reader users jump between them.
  headingLevel?: 1 | 2
  // The page's focus target after a "Try again" that worked
  // (`useRetryFocus`) — the heading IS this component's, so the page hands
  // its ref down. Given → the heading is also focusable by code
  // (tabIndex -1, kept out of the Tab order).
  headingRef?: Ref<HTMLHeadingElement>
}

// The two looks, one per level: a page title, or a section heading.
const HEADING_STYLE = {
  1: 'text-2xl font-semibold',
  2: 'text-lg font-medium',
} as const

// One field, styled as a heading rather than a labeled row like
// EditableExerciseListField below it — name is the only scalar string
// field of a description, so this stays a dedicated component rather
// than a generic "editable text field" built for a case that doesn't
// exist here.
export function EditableExerciseTitle({
  name,
  save,
  canEdit,
  headingLevel = 1,
  headingRef,
}: EditableExerciseTitleProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const [validationError, setValidationError] = useState<string | null>(null)

  // One mutation per field: its own pending state and error. onSuccess in
  // the mutation's OPTIONS, which runs even if the field unmounted
  // meanwhile (EditableField's reasoning). The mutationFn passes `save`
  // exactly ONE argument: TanStack Query v5 calls a mutationFn with a
  // second, context argument, which must not leak into the caller's `save`
  // (found in EditableField, 3b-2).
  const updateMutation = useMutation({
    mutationFn: (newName: string) => save({ name: newName }),
    onSuccess: () => setIsEditing(false),
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
    // Trimmed before checking AND before sending: "   " is no name (the
    // backend refuses it too, "The exercise's name can't be blank"), and
    // spaces around a real name are only noise.
    const trimmed = draft.trim()
    if (trimmed.length === 0) {
      setValidationError('Name is required')
      return
    }
    if (trimmed.length > EXERCISE_NAME_MAX_LENGTH) {
      setValidationError(
        `Name must be ${EXERCISE_NAME_MAX_LENGTH} characters or fewer`,
      )
      return
    }
    updateMutation.mutate(trimmed)
  }

  // A component chosen at render time: 'h1' or 'h2' as a JSX tag.
  const Heading = headingLevel === 1 ? 'h1' : 'h2'

  if (!isEditing) {
    return (
      <div className="flex items-start gap-2">
        <Heading
          ref={headingRef}
          tabIndex={headingRef ? -1 : undefined}
          className={`${HEADING_STYLE[headingLevel]} outline-none`}
        >
          {name}
        </Heading>
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
          className={HEADING_STYLE[headingLevel]}
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
          {failureText(updateMutation.error)}
        </p>
      )}
    </div>
  )
}