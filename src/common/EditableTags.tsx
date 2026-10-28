import { useId, useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { failureText } from '@/api/apiErrors'
import { TagInput } from './TagInput'
import {
  commitTagText,
  EMPTY_TAG_DRAFT,
  removeTagAt,
  sameTags,
  typeTagText,
  type TagDraft,
  type TagDraftUpdate,
  type TagRules,
} from './tagList'

interface EditableTagsProps extends TagRules {
  label: string
  values: string[]
  // Same contract as EditableField's `save`: the caller decides what
  // saving means; this component only needs the promise.
  save: (values: string[]) => Promise<unknown>
}

// The list counterpart of EditableField: view → Edit → Save / Cancel, for
// a value that is a list of short strings (specialties). Same shape on
// purpose, so the profile page reads as one consistent set of rows.
export function EditableTags({
  label,
  values,
  save,
  itemSchema,
  maxItems,
}: EditableTagsProps) {
  const rules: TagRules = { itemSchema, maxItems }
  const [isEditing, setIsEditing] = useState(false)
  // The chips and the typed text, as one value — see TagDraft. Every
  // editing rule (commas, duplicates, the maximum…) lives in tagList.ts
  // and is shared with TagListField, the version used inside forms.
  const [draft, setDraft] = useState<TagDraft>(EMPTY_TAG_DRAFT)
  const [error, setError] = useState<string | null>(null)
  const inputId = useId()

  // See EditableField for why onSuccess lives in the options — and for
  // why `(next) => save(next)`, not `save` itself: TanStack Query calls a
  // mutationFn with a SECOND argument (its own context object), and
  // passing `save` directly handed that object to the caller's function
  // too. The contract is "save these values", nothing more.
  const mutation = useMutation({
    mutationFn: (next: string[]) => save(next),
    onSuccess: () => setIsEditing(false),
  })

  function startEditing() {
    // A COPY of the stored list: edits happen on the copy, and Cancel
    // simply throws it away.
    setDraft({ tags: [...values], text: '' })
    setError(null)
    mutation.reset()
    setIsEditing(true)
  }

  // Every editing step returns the next draft plus an error (or null);
  // this applies both. A refused entry keeps its text in the box, with
  // the message on screen, for the person to fix.
  function apply(update: TagDraftUpdate) {
    setDraft(update.draft)
    setError(update.error)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    // Text typed but never confirmed with Enter or a comma is still what
    // the person meant to add — include it rather than silently drop it.
    const update = commitTagText(draft, rules)
    apply(update)
    if (update.error) return
    const finalTags = update.draft.tags

    if (sameTags(finalTags, values)) {
      setIsEditing(false)
      return
    }
    // An empty list is a real value ("no specialties"), sent as [] —
    // never null, which the backend rejects for this NOT NULL column.
    mutation.mutate(finalTags)
  }

  if (!isEditing) {
    return (
      <div className="flex items-start justify-between gap-4 py-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          {values.length > 0 ? (
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {values.map((tag) => (
                <li key={tag} className="rounded-full bg-muted px-2 py-0.5 text-sm">
                  {tag}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground italic">Not set</p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={startEditing} aria-label={`Edit ${label}`}>
          Edit
        </Button>
      </div>
    )
  }

  const errorMessage =
    error ??
    (mutation.isError
      ? failureText(mutation.error)
      : null)

  return (
    <form
      onSubmit={submit}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setIsEditing(false)
      }}
      className="space-y-2 py-3"
      noValidate
    >
      <label htmlFor={inputId} className="text-sm text-muted-foreground">
        {label}
      </label>
      <TagInput
        id={inputId}
        tags={draft.tags}
        text={draft.text}
        onTextChange={(text) => apply(typeTagText(draft, text, rules))}
        onCommit={() => apply(commitTagText(draft, rules))}
        onRemove={(index) => apply({ draft: removeTagAt(draft, index), error: null })}
        invalid={!!errorMessage}
        disabled={mutation.isPending}
        placeholder="Type, then press Enter"
      />
      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Save'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(false)}
          disabled={mutation.isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}