import { useId, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { ZodType } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/api/client'

interface EditableFieldProps {
  label: string
  // The stored value. null means "not set" and shows as such.
  value: string | null
  // This field's own validator (firstNameSchema, phoneSchema, …). Besides
  // checking the value, it decides whether the field can be CLEARED: if
  // the schema accepts '', an emptied field is saved as `null`; if it
  // rejects '', emptying the field shows the schema's "required" message.
  // One rule, written once, instead of a separate `clearable` prop that
  // could disagree with it.
  schema: ZodType<string>
  // What saving means. The field doesn't know which resource it belongs
  // to (a user, a clinic…) — the caller passes a function that sends the
  // new value and updates the cache (e.g. useSaveUser). The field only
  // needs to know when that finished, and whether it failed.
  save: (value: string | null) => Promise<unknown>
  inputType?: 'text' | 'tel' | 'date' | 'textarea'
  // How to DISPLAY a stored value, e.g. '1990-01-01' → "January 1, 1990".
  // Only affects the view; the edit box always holds the raw value.
  formatValue?: (value: string) => string
  // When set, the field is shown but can't be edited: no Edit button, and
  // this short explanation instead (e.g. why the license number is locked).
  readOnlyNote?: string
  // The input's `min` / `max` (dates, as 'YYYY-MM-DD'). They only GUIDE the
  // browser's picker — days outside are greyed out —, they don't validate:
  // the form is `noValidate`, so the schema stays the one rule that decides
  // (a typed date can still be outside, and gets the schema's message).
  min?: string
  max?: string
  // What saving THIS draft would do, said before saving (e.g. "Planned
  // changes after that day will never apply") — or null when there's
  // nothing to say. Called with the draft as typed, on every change, while
  // editing; shown under the input in a polite live region, so a screen
  // reader hears the consequence as the value changes.
  describeDraft?: (draft: string) => ReactNode
  // A button beside Save that saves "no value" (null) at once — for a
  // field where emptying the input isn't an obvious gesture (a date input
  // has no visible "empty" state in every browser). Shown only while a
  // value is stored. Its text says what it means ("Remove end date").
  clearLabel?: string
  // What the view shows when no value is stored. "Not set" by default; a
  // field where "none" is a meaning of its own says it ("No end date").
  emptyText?: string
}

// The "view → Edit → Save / Cancel" row used on every per-field edit page.
// Extracted from the former EditableClinicField (since removed — the
// clinic page now uses this too), which was clinic-specific only in
// the ONE line that sent the request — that line is now the `save` prop.
export function EditableField({
  label,
  value,
  schema,
  save,
  inputType = 'text',
  formatValue,
  readOnlyNote,
  min,
  max,
  describeDraft,
  clearLabel,
  emptyText,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  // useId() generates an id that is unique on the page and stable across
  // renders. The <label htmlFor> ↔ <input id> pair needs one, and a
  // hard-coded id would collide as soon as two fields share a page.
  const inputId = useId()
  const draftNoteId = useId()

  // One mutation per field instance: each field has its own pending and
  // error state, so saving the phone number never disables the bio.
  //
  // `onSuccess` lives HERE, in the mutation's own options, not in a
  // per-call mutate(value, { onSuccess }). The per-call version is skipped
  // if the component that called mutate() has unmounted before the
  // request finishes — the exact trap behind the role-switcher bug. The
  // options version always runs.
  //
  // `(value) => save(value)`, not `save` itself: TanStack Query calls a
  // mutationFn with a SECOND argument (its own context object), and passing
  // `save` directly handed that object to every caller's function too —
  // found in step 3b-2, when a test checked the exact arguments. The
  // contract is "save this value", nothing more.
  const mutation = useMutation({
    mutationFn: (value: string | null) => save(value),
    onSuccess: () => setIsEditing(false),
  })

  function startEditing() {
    setDraft(value ?? '')
    setValidationError(null)
    // A previous failed attempt's server error shouldn't greet the next
    // attempt: reset() clears the mutation's error state.
    mutation.reset()
    setIsEditing(true)
  }

  function cancel() {
    setIsEditing(false)
    setValidationError(null)
  }

  function submit(event: FormEvent) {
    // A <form> submit would otherwise reload the whole page (the browser's
    // default for forms). We handle saving ourselves.
    event.preventDefault()

    // Leading/trailing spaces are never meaningful here, and a field
    // holding only spaces is really an empty field.
    const trimmed = draft.trim()

    // Nothing changed: close without a request. Saves a round trip, and
    // avoids a pointless write that would still show in the audit log.
    if (trimmed === (value ?? '')) {
      setIsEditing(false)
      return
    }

    const result = schema.safeParse(trimmed)
    if (!result.success) {
      setValidationError(result.error.issues[0]?.message ?? 'Invalid value')
      return
    }

    // Reaching this line with '' means the schema ACCEPTED an empty value,
    // i.e. this is a clearable field — so "cleared" is sent as null, which
    // the backend stores as NULL ("no value"), not as an empty string.
    mutation.mutate(trimmed === '' ? null : result.data)
  }

  // Escape cancels, like most inline editors. (Enter saves for free: it
  // submits the surrounding <form>. Not in a textarea, where Enter must
  // insert a new line — there, the Save button is the way to save.)
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      cancel()
    }
  }

  if (readOnlyNote) {
    return (
      <ReadOnlyField
        label={label}
        value={value}
        formatValue={formatValue}
        note={readOnlyNote}
        emptyText={emptyText}
      />
    )
  }

  if (!isEditing) {
    return (
      <FieldRow
        label={label}
        value={value}
        formatValue={formatValue}
        emptyText={emptyText}
        action={
          // Every row has an "Edit" button, so each needs its own name
          // ("Edit Phone", "Edit Bio") for screen readers and for tests —
          // a page of identical "Edit" buttons can't be told apart.
          <Button
            variant="ghost"
            size="sm"
            onClick={startEditing}
            aria-label={`Edit ${label}`}
          >
            Edit
          </Button>
        }
      />
    )
  }

  const errorMessage =
    validationError ??
    (mutation.isError
      ? mutation.error instanceof ApiError
        ? mutation.error.messages.join(', ')
        : 'Something went wrong'
      : null)

  // Computed from the draft on every render while editing — typing or
  // picking a day re-renders, so the sentence follows the value.
  const draftNote = describeDraft ? describeDraft(draft) : null

  const sharedInputProps = {
    id: inputId,
    autoFocus: true,
    value: draft,
    onChange: (event: { target: { value: string } }) => {
      setDraft(event.target.value)
      setValidationError(null)
    },
    onKeyDown: handleKeyDown,
    'aria-invalid': !!errorMessage,
    // The consequence note describes the input (only when the field has
    // one): a screen reader reads it with the field when it gets focus.
    'aria-describedby': describeDraft ? draftNoteId : undefined,
    disabled: mutation.isPending,
  }

  return (
    <form onSubmit={submit} className="space-y-2 py-3" noValidate>
      <label htmlFor={inputId} className="text-sm text-muted-foreground">
        {label}
      </label>
      {inputType === 'textarea' ? (
        <Textarea {...sharedInputProps} rows={4} />
      ) : (
        <Input {...sharedInputProps} type={inputType} min={min} max={max} />
      )}
      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
      {/* Always in the page while editing (when the field has a note), even
          empty: a live region that changes its text is announced reliably;
          one that appears already filled often isn't (the editor's notice,
          3a-w). */}
      {describeDraft && (
        <div id={draftNoteId} aria-live="polite">
          {draftNote}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Save'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={cancel}
          disabled={mutation.isPending}
        >
          Cancel
        </Button>
        {/* Saves null directly: "no value" needs no checking. The schema
            isn't asked — it judges what was TYPED, and nothing was. */}
        {clearLabel && value !== null && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => mutation.mutate(null)}
            disabled={mutation.isPending}
          >
            {clearLabel}
          </Button>
        )}
      </div>
    </form>
  )
}

interface ReadOnlyFieldProps {
  label: string
  value: string | null
  formatValue?: (value: string) => string
  // Why it can't be edited — shown under the value.
  note?: string
  // What to show when there's no value ("Not set" by default).
  emptyText?: string
}

// A field that is shown but never editable here (e.g. email, whose change
// is its own future flow). Same look as EditableField's view, minus the
// Edit button, so read-only and editable rows line up on one page.
export function ReadOnlyField({ label, value, formatValue, note, emptyText }: ReadOnlyFieldProps) {
  return (
    <FieldRow
      label={label}
      value={value}
      formatValue={formatValue}
      note={note}
      emptyText={emptyText}
    />
  )
}

interface FieldRowProps extends ReadOnlyFieldProps {
  // What goes on the right: an Edit button, or nothing.
  action?: ReactNode
}

// The one "label above value" row shared by both components above.
function FieldRow({ label, value, formatValue, note, action, emptyText }: FieldRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        {value !== null && value !== '' ? (
          // whitespace-pre-line: a multi-line bio keeps its line breaks.
          // wrap-break-word (Tailwind v4's name for overflow-wrap:
          // break-word): a long unbroken string can't overflow the card.
          <p className="whitespace-pre-line wrap-break-word">
            {formatValue ? formatValue(value) : value}
          </p>
        ) : (
          <p className="text-muted-foreground italic">{emptyText ?? 'Not set'}</p>
        )}
        {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
      </div>
      {action}
    </div>
  )
}