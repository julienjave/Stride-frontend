import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ZodType } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { failureText } from '@/api/apiErrors'
import { updateClinic, clinicQueryKey } from './api'
import type { UpdateClinicPayload } from './types'

interface EditableClinicFieldProps {
  clinicId: number
  // Constrained to UpdateClinicPayload's own keys — the ONE place this
  // component and the payload type are tied together, so a typo here
  // (e.g. 'ema1l') is a compile error, not a silent no-op PATCH.
  fieldKey: keyof UpdateClinicPayload
  label: string
  value: string | null
  // The field's own validator from schemas.ts (clinicNameSchema,
  // clinicPhoneSchema, etc.) — passed in, not hardcoded here, which is
  // what lets ONE component serve all five fields despite them having two
  // genuinely different behaviors (name/email can never be emptied;
  // phone/address/website can). See save() below for how that difference
  // falls out of the schema alone, with no separate "clearable" flag.
  schema: ZodType<string>
}

export function EditableClinicField({
  clinicId,
  fieldKey,
  label,
  value,
  schema,
}: EditableClinicFieldProps) {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const [validationError, setValidationError] = useState<string | null>(null)

  // One mutation per FIELD instance (this component is rendered once per
  // field on the page), not one shared mutation for the whole clinic —
  // deliberately, so each field's own pending/error state is naturally
  // independent, with no bookkeeping needed to work out "which field is
  // this shared mutation currently in flight for."
  const updateMutation = useMutation({
    mutationFn: (payload: UpdateClinicPayload) => updateClinic(clinicId, payload),
    onSuccess: (updated) => {
      // setQueryData here, not invalidateQueries — this is exactly the
      // "who am I" shape CurrentUser's mutations already use: the PATCH
      // response IS the full, authoritative new clinic object, so writing
      // it straight into clinicQueryKey(clinicId)'s cache entry is both
      // correct and avoids an unnecessary extra round trip to re-fetch
      // something we were just handed.
      queryClient.setQueryData(clinicQueryKey(clinicId), updated)
      // The LIST is a different cache entry showing (among other things)
      // this clinic's name/email — invalidate it so it picks up the
      // change next time it's viewed, same reasoning as CreateClinicPage.
      //
      // A prefix match on 'clinics-list' (not exact) sweeps BOTH cached
      // list variants (active-only and include-inactive) — this used to
      // be a real, tested-and-caught bug when the list key shared a
      // prefix with clinicQueryKey(id): invalidating ['clinics'] without
      // exact: true also invalidated clinicQueryKey(clinicId), the exact
      // entry setQueryData just wrote fresh data into two lines above.
      // clinicsListQueryKey now lives under a DIFFERENT top-level key
      // ('clinics-list', not 'clinics') specifically so that collision
      // can't happen anymore, regardless of how this invalidation is written.
      void queryClient.invalidateQueries({ queryKey: ['clinics-list'] })
      setIsEditing(false)
    },
  })

  function startEditing() {
    setDraft(value ?? '')
    setValidationError(null)
    setIsEditing(true)
  }

  function cancel() {
    setIsEditing(false)
    setValidationError(null)
  }

  function save() {
    const result = schema.safeParse(draft)
    if (!result.success) {
      setValidationError(result.error.issues[0]?.message ?? 'Invalid value')
      return
    }

    // draft === '' can only reach this line at all if `schema` itself
    // accepts an empty string — clinicNameSchema/clinicEmailSchema reject
    // '' outright (see schemas.ts), so safeParse would already have
    // returned failure above for those two fields, and we'd never get
    // here with an empty draft. Reaching this point with draft === ''
    // therefore means, by construction, that this is a genuinely
    // clearable field. Converting that case to an explicit `null` — not
    // sending '' — is what makes "the person cleared this box and hit
    // Save" actually unset the database column, rather than storing an
    // empty string (see UpdateClinicPayload's comment in types.ts for why
    // that distinction matters).
    const valueToSend: string | null = draft === '' ? null : result.data

    // No type assertion here, deliberately — an earlier draft of this
    // line had one, until eslint's no-unnecessary-type-assertion rule
    // flagged it as pointless, which turned out to reveal something more
    // interesting than a redundant cast. TypeScript does NOT verify this
    // assignment is correct per-key at all: with a genuinely dynamic key
    // typed only as `keyof UpdateClinicPayload` (not a specific literal
    // like 'name'), TypeScript can't check "does this key's own declared
    // type allow this value" — it falls back to checking valueToSend
    // against the UNION of every possible value type across every key in
    // UpdateClinicPayload (roughly `string | null | undefined`), which
    // `string | null` always satisfies, regardless of which key fieldKey
    // actually is. Proof this is a real gap, not a guess: assigning the
    // literal `{ name: null }` directly IS correctly rejected by
    // TypeScript (null isn't assignable to name's real type, string) —
    // it's specifically the computed-key form that loses that precision.
    // The cast changed nothing, because TypeScript was already letting
    // this through on its own. The actual safety here is a pure RUNTIME
    // guarantee, not a type-checked one: valueToSend can only be null
    // when draft === '' AND schema.safeParse('') succeeded, and
    // clinicNameSchema/clinicEmailSchema are written to always reject an
    // empty string — so in practice this function is never called with
    // {name: null} or {email: null}, but that fact lives entirely in
    // schemas.ts's validation rules, not in anything the compiler itself
    // is checking on this line.
    updateMutation.mutate({ [fieldKey]: valueToSend })
  }

  if (!isEditing) {
    return (
      <div className="flex items-center justify-between py-2">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p>{value ?? <span className="text-muted-foreground italic">Not set</span>}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={startEditing}>
          Edit
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-1 py-2">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="flex gap-2">
        <Input
          autoFocus
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setValidationError(null)
          }}
          aria-invalid={!!validationError}
          disabled={updateMutation.isPending}
        />
        <Button size="sm" onClick={save} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Saving…' : 'Save'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={cancel}
          disabled={updateMutation.isPending}
        >
          Cancel
        </Button>
      </div>
      {validationError && <p className="text-sm text-destructive">{validationError}</p>}
      {updateMutation.isError && (
        <p className="text-sm text-destructive">
          {failureText(updateMutation.error)}
        </p>
      )}
    </div>
  )
}