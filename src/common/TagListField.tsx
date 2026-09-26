import { useState } from 'react'
import { TagInput } from './TagInput'
import {
  commitTagText,
  EMPTY_TAG_DRAFT,
  removeTagAt,
  typeTagText,
  type TagDraft,
  type TagDraftUpdate,
  type TagRules,
} from './tagList'

interface TagListFieldProps extends TagRules {
  id: string
  // The whole draft — chips AND unconfirmed text — as held by the form.
  // `undefined` before the form has a value for it (react-hook-form gives
  // a field no value until it's set), treated as an empty draft.
  value: TagDraft | undefined
  onChange: (draft: TagDraft) => void
  // The form's own validation message for this field — the one produced
  // at submit time by tagDraftSchema (e.g. text left in the box that is
  // a duplicate).
  error?: string
  disabled?: boolean
}

// A tag list INSIDE a form (create user, grant role) — the counterpart of
// EditableTags, which is a self-contained "Edit → Save" row. No Save
// button here: the form's own submit button saves everything at once.
//
// Controlled: the draft lives in the form (react-hook-form, through a
// <Controller>), not in this component. That's what lets the form's
// schema see the half-typed text at submit time and include it (see
// tagDraftSchema). Every rule comes from tagList.ts, shared with
// EditableTags, so both behave identically.
export function TagListField({
  id,
  value = EMPTY_TAG_DRAFT,
  onChange,
  itemSchema,
  maxItems,
  error,
  disabled,
}: TagListFieldProps) {
  const rules: TagRules = { itemSchema, maxItems }
  // A message from the last keystroke or Enter ("already in the list").
  // Local state: it's about what the person is doing right now, and it
  // clears on their next action. The form's `error` only exists after a
  // submit attempt.
  const [editError, setEditError] = useState<string | null>(null)

  function apply(update: TagDraftUpdate) {
    onChange(update.draft)
    setEditError(update.error)
  }

  // The immediate message wins; after a submit, the form's message shows
  // until the next edit re-validates the field.
  const message = editError ?? error

  return (
    <>
      <TagInput
        id={id}
        tags={value.tags}
        text={value.text}
        onTextChange={(text) => apply(typeTagText(value, text, rules))}
        onCommit={() => apply(commitTagText(value, rules))}
        onRemove={(index) => apply({ draft: removeTagAt(value, index), error: null })}
        invalid={!!message}
        disabled={disabled}
        placeholder="Type, then press Enter"
      />
      {message && <p className="text-sm text-destructive">{message}</p>}
    </>
  )
}