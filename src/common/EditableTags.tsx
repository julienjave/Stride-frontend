import { useId, useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/api/client'
import { TagInput } from './TagInput'
import { addTag, sameTags, splitTypedText, type TagRules } from './tagList'

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
  const [tags, setTags] = useState<string[]>([])
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputId = useId()

  // See EditableField for why onSuccess lives in the options.
  const mutation = useMutation({
    mutationFn: save,
    onSuccess: () => setIsEditing(false),
  })

  function startEditing() {
    // A COPY of the stored list: edits happen on the copy, and Cancel
    // simply throws it away.
    setTags([...values])
    setText('')
    setError(null)
    mutation.reset()
    setIsEditing(true)
  }

  // Adds each entry in turn, stopping at the first one that's refused.
  // Entries accepted before that point are kept (`tags`), and `failed`
  // tells the caller to leave the refused text in the box, with its
  // message on screen, for the person to fix.
  function commitEntries(
    current: string[],
    entries: string[],
  ): { tags: string[]; failed: boolean } {
    let next = current
    for (const entry of entries) {
      const result = addTag(next, entry, rules)
      if (!result.ok) {
        setError(result.error)
        setText(entry.trim())
        return { tags: next, failed: true }
      }
      next = result.tags
    }
    return { tags: next, failed: false }
  }

  function handleTextChange(newText: string) {
    setError(null)
    // A comma finishes an entry (typed, or several in a paste).
    const { complete, rest } = splitTypedText(newText)
    if (complete.length === 0) {
      setText(newText)
      return
    }
    const { tags: next, failed } = commitEntries(tags, complete)
    setTags(next)
    if (!failed) setText(rest)
  }

  function handleCommit() {
    const { tags: next, failed } = commitEntries(tags, [text])
    setTags(next)
    if (!failed) setText('')
  }

  function handleRemove(index: number) {
    setError(null)
    // filter() builds a new array without that one entry.
    setTags(tags.filter((_, position) => position !== index))
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    // Text typed but never confirmed with Enter or a comma is still what
    // the person meant to add — include it rather than silently drop it.
    const { tags: finalTags, failed } = commitEntries(tags, [text])
    if (failed) return
    setTags(finalTags)
    setText('')

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
      ? mutation.error instanceof ApiError
        ? mutation.error.messages.join(', ')
        : 'Something went wrong'
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
        tags={tags}
        text={text}
        onTextChange={handleTextChange}
        onCommit={handleCommit}
        onRemove={handleRemove}
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