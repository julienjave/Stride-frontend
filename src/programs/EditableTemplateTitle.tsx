import { type Ref, useState, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { failureText } from '@/api/apiErrors'
import { updateTemplate, programQueryKey } from './api'
import { upsertInProgramsList } from './programsListCache'
import { TITLE_MAX_LENGTH } from '@/common/titleLimit'

interface EditableTemplateTitleProps {
  templateId: number
  title: string
  // Pencil only rendered when true — see canEditTemplate for the rule.
  canEdit: boolean
  // Optional extra content shown beside the title in DISPLAY mode only
  // (TemplateDetailPage passes the "Yours" badge). A generic slot rather
  // than an `isOwn` prop, so this editor stays about editing a title and
  // doesn't need to know what ownership is or how it's decided.
  adornment?: ReactNode
  // The page's focus target after a "Try again" that worked
  // (`useRetryFocus`) — the same prop as EditableExerciseTitle's.
  headingRef?: Ref<HTMLHeadingElement>
}

// A close mirror of EditableExerciseTitle on the Library's detail page:
// the title IS the page heading, with a pencil beside it; editing swaps
// the heading for an input with tick/x; saving is immediate, with no
// page-level Save button. Kept as its own component rather than
// generalizing EditableExerciseTitle, because the two differ in exactly
// the parts that matter — which endpoint they call, which caches they
// update, and their wording — and a shared "editable heading" would
// need a prop for each of those, ending up no simpler than two small,
// readable components.
export function EditableTemplateTitle({
  templateId,
  title,
  canEdit,
  adornment,
  headingRef,
}: EditableTemplateTitleProps) {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  // The in-progress text, separate from the `title` prop: the prop is
  // the saved value (from the cache), the draft is what's being typed.
  // Keeping them apart is what makes Cancel trivial — just stop editing;
  // the prop was never touched.
  const [draft, setDraft] = useState(title)
  const [validationError, setValidationError] = useState<string | null>(null)

  const updateMutation = useMutation({
    mutationFn: (newTitle: string) =>
      updateTemplate(templateId, { title: newTitle }),
    onSuccess: (updated) => {
      // The response is the full enriched template (see updateTemplate),
      // so it can replace the detail cache entry wholesale without the
      // exercise list below losing anything.
      queryClient.setQueryData(programQueryKey(templateId), updated)
      // The Programs hub lists templates by title — patch that too, so
      // the hub shows the new name on its very first paint.
      upsertInProgramsList(queryClient, updated)
      setIsEditing(false)
    },
  })

  function startEditing() {
    // Re-seed from the CURRENT saved title each time — otherwise a draft
    // abandoned with Cancel earlier would reappear on the next edit.
    setDraft(title)
    setValidationError(null)
    setIsEditing(true)
  }

  function cancel() {
    setIsEditing(false)
    setValidationError(null)
  }

  function confirm() {
    // Same rules as createTemplateSchema's title, checked here directly
    // since there's no form library on a single inline field.
    const trimmed = draft.trim()
    if (trimmed.length === 0) {
      setValidationError('Title is required')
      return
    }
    if (trimmed.length > TITLE_MAX_LENGTH) {
      setValidationError(
        `Title must be ${TITLE_MAX_LENGTH} characters or fewer`,
      )
      return
    }
    updateMutation.mutate(trimmed)
  }

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <h1
          ref={headingRef}
          tabIndex={headingRef ? -1 : undefined}
          className="text-2xl font-semibold outline-none"
        >
          {title}
        </h1>
        {adornment}
        {canEdit && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Edit template title"
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
          aria-label="Template title"
          aria-invalid={!!validationError}
          disabled={updateMutation.isPending}
          className="text-2xl font-semibold"
        />
        <Button
          type="button"
          size="icon"
          aria-label="Save title"
          onClick={confirm}
          disabled={updateMutation.isPending}
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Cancel editing title"
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