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
}

// The "view → Edit → Save / Cancel" row used on every per-field edit page.
// Extracted from EditableClinicField, which was clinic-specific only in
// the ONE line that sent the request — that line is now the `save` prop.
export function EditableField({
  label,
  value,
  schema,
  save,
  inputType = 'text',
  formatValue,
  readOnlyNote,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  // useId() generates an id that is unique on the page and stable across
  // renders. The <label htmlFor> ↔ <input id> pair needs one, and a
  // hard-coded id would collide as soon as two fields share a page.
  const inputId = useId()

  // One mutation per field instance: each field has its own pending and
  // error state, so saving the phone number never disables the bio.
  //
  // `onSuccess` lives HERE, in the mutation's own options, not in a
  // per-call mutate(value, { onSuccess }). The per-call version is skipped
  // if the component that called mutate() has unmounted before the
  // request finishes — the exact trap behind the role-switcher bug. The
  // options version always runs.
  const mutation = useMutation({
    mutationFn: save,
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
      <ReadOnlyField label={label} value={value} formatValue={formatValue} note={readOnlyNote} />
    )
  }

  if (!isEditing) {
    return (
      <FieldRow
        label={label}
        value={value}
        formatValue={formatValue}
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
        <Input {...sharedInputProps} type={inputType} />
      )}
      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
      <div className="flex gap-2">
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
}

// A field that is shown but never editable here (e.g. email, whose change
// is its own future flow). Same look as EditableField's view, minus the
// Edit button, so read-only and editable rows line up on one page.
export function ReadOnlyField({ label, value, formatValue, note }: ReadOnlyFieldProps) {
  return <FieldRow label={label} value={value} formatValue={formatValue} note={note} />
}

interface FieldRowProps extends ReadOnlyFieldProps {
  // What goes on the right: an Edit button, or nothing.
  action?: ReactNode
}

// The one "label above value" row shared by both components above.
function FieldRow({ label, value, formatValue, note, action }: FieldRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        {value !== null && value !== '' ? (
          // whitespace-pre-line: a multi-line bio keeps its line breaks.
          // break-words: a long unbroken string can't overflow the card.
          <p className="whitespace-pre-line break-words">
            {formatValue ? formatValue(value) : value}
          </p>
        ) : (
          <p className="text-muted-foreground italic">Not set</p>
        )}
        {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
      </div>
      {action}
    </div>
  )
}