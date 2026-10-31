import { type Ref, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { LoadFailure } from '@/common/LoadError'
import { NativeSelect } from '@/common/NativeSelect'
import { NotAvailable } from '@/common/NotAvailable'
import { useRetryFocus } from '@/common/useRetryFocus'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useUser } from '@/users/useUser'
import { describeFailure } from '@/workouts/useWorkoutEditing'
import { medicalFileEntryPath, medicalFilePath } from './medicalFilePaths'
import {
  REASON_MAX_LENGTH,
  SECTION_MAX_LENGTH,
  draftFrom,
  draftProblems,
  emptyDraft,
  entryBody,
  type DraftField,
  type DraftProblem,
  type EntryDraft,
} from './medicalFileRules'
import { ENTRY_TYPE_LABELS, SECTION_HINTS, SECTION_LABELS, entryHeading } from './medicalFileText'
import { ENTRY_TYPES, SECTIONS, type EntryType, type MedicalFileEntry } from './types'
import { useAddMedicalFileEntry, useMedicalFileEntry } from './useMedicalFile'
import { Loading } from '@/common/Loading'
import { showSuccess } from '@/snackbars/snackbarStore'

// Writing in the medical file — `/practitioner/patients/:id/medical-file/new`
// (Phase 6, decisions §8): its own page, so the four sections get room even
// at 375 px. With `?amends=<id>` it writes an AMENDMENT of that version: the
// form starts as a copy of it, and a reason is required. Saving returns to
// the file (replacing this page in the history — Back from the file doesn't
// reopen a form already sent).
export function MedicalFileEntryPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const patientId = Number(id)
  const amendsParam = searchParams.get('amends')
  const amendsId = amendsParam === null ? null : Number(amendsParam)

  if (!Number.isInteger(patientId) || patientId < 1) {
    return (
      <Page>
        <p className="text-sm text-destructive">This address isn't valid.</p>
      </Page>
    )
  }
  // An entry id that isn't a number can't be an entry: the same words as one
  // that doesn't exist (they reveal nothing a typed id couldn't).
  if (amendsId !== null && (!Number.isInteger(amendsId) || amendsId < 1)) {
    return (
      <Page>
        <EntryNotAvailable patientId={patientId} />
      </Page>
    )
  }
  return amendsId === null ? (
    <EntryForm key="new" patientId={patientId} />
  ) : (
    <AmendView key={amendsId} patientId={patientId} amendsId={amendsId} />
  )
}

// Amending: the version to correct is read first (GET /medical-files/:id,
// itself an audited read — the practitioner is about to rewrite it).
function AmendView({ patientId, amendsId }: { patientId: number; amendsId: number }) {
  const entry = useMedicalFileEntry(patientId, amendsId)
  // After a "Try again" that worked, focus goes to the heading of what the
  // page then shows: the form, or "amended since" (each takes this ref).
  const heading = useRetryFocus<HTMLHeadingElement>('the entry', entry.isSuccess)

  // A 404 (hidden or missing — the backend doesn't say which), or an entry
  // of ANOTHER patient under this patient's address: neither is amended
  // here (the backend would refuse the second anyway) — "not available".
  // Any other failure: "Try again".
  if (entry.isError) {
    return (
      <Page>
        <LoadFailure
          queries={[entry]}
          what="the entry"
          notAvailable={<EntryNotAvailable patientId={patientId} />}
        >
          <BackToFile patientId={patientId} />
        </LoadFailure>
      </Page>
    )
  }
  if (entry.isSuccess && entry.data.patientId !== patientId) {
    return (
      <Page>
        <EntryNotAvailable patientId={patientId} />
      </Page>
    )
  }
  if (!entry.isSuccess) {
    return (
      <Page>
        <Loading label="Loading the entry…" />
      </Page>
    )
  }
  if (entry.data.amendedById !== null) {
    // Corrected already (an old link, or a colleague a moment ago): amend
    // the newer version instead — a chain, never a branch.
    return (
      <Page>
        <h1 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">
          This entry has been amended since
        </h1>
        <p className="text-sm">
          A newer version replaces it. Amend that version instead, so the corrections stay in
          order.
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <Link
            to={medicalFileEntryPath(patientId, entry.data.amendedById)}
            className="font-medium underline underline-offset-4"
          >
            Amend the newer version
          </Link>
          <BackToFile patientId={patientId} />
        </div>
      </Page>
    )
  }
  return <EntryForm patientId={patientId} original={entry.data} headingRef={heading} />
}

function EntryForm({
  patientId,
  original,
  headingRef,
}: {
  patientId: number
  original?: MedicalFileEntry
  // An amendment's form: the focus target after a "Try again" that worked.
  headingRef?: Ref<HTMLHeadingElement>
}) {
  const navigate = useNavigate()
  const patient = useUser(patientId)
  const name = patient.data ? `${patient.data.firstName} ${patient.data.lastName}` : null
  const [draft, setDraft] = useState<EntryDraft>(() => (original ? draftFrom(original) : emptyDraft()))
  // The problems found when Save was last pressed — shown at their fields
  // until the next press (typing doesn't re-check: a message appearing while
  // someone is still writing is noise).
  const [problems, setProblems] = useState<DraftProblem[]>([])
  const add = useAddMedicalFileEntry(patientId)

  // Where focus goes when Save finds a problem: the first field concerned
  // (for "at least one section", the first section).
  const typeRef = useRef<HTMLSelectElement>(null)
  const firstSectionRef = useRef<HTMLTextAreaElement>(null)
  const reasonRef = useRef<HTMLTextAreaElement>(null)
  function focusField(field: DraftField) {
    const target = { entryType: typeRef, sections: firstSectionRef, reason: reasonRef }[field]
    target.current?.focus()
  }

  function problemFor(field: DraftField): string | undefined {
    return problems.find((problem) => problem.field === field)?.message
  }

  function update(changes: Partial<EntryDraft>) {
    setDraft((current) => ({ ...current, ...changes }))
  }

  function onSubmit(event: FormEvent) {
    // A <form> submits on Enter in the select too; without preventDefault
    // the browser would also navigate (a full page load).
    event.preventDefault()
    const found = draftProblems(draft, original)
    setProblems(found)
    if (found.length > 0 || draft.entryType === '') {
      focusField(found[0]?.field ?? 'entryType')
      return
    }
    add.mutate(entryBody({ ...draft, entryType: draft.entryType }, patientId, original?.id), {
      // The confirmation is a snackbar (decisions §33): it outlives this
      // page, which the file REPLACES in the history.
      onSuccess: () => {
        showSuccess(original ? 'Amendment saved.' : 'Entry added.')
        void navigate(medicalFilePath(patientId), { replace: true })
      },
    })
  }

  return (
    <Page>
      <div className="space-y-1">
        <h1
          ref={headingRef}
          tabIndex={headingRef ? -1 : undefined}
          className="text-xl font-semibold outline-none"
        >
          {original ? 'Amend an entry' : 'New entry'}
        </h1>
        {name && <p className="text-sm text-muted-foreground">{name}</p>}
      </div>

      {original && (
        <p className="rounded-lg border bg-muted/40 p-3 text-sm">
          You're correcting <strong>{entryHeading(original)}</strong>, written by{' '}
          {original.author.firstName} {original.author.lastName}. Your version replaces it in the
          file; the original stays, marked as amended.
        </p>
      )}

      {/* noValidate: the page checks the draft itself (draftProblems) and
          says what's wrong at each field, instead of the browser's own
          bubbles. */}
      <form noValidate onSubmit={onSubmit} className="space-y-6">
        <Field id="entry-type" label="Type of entry" error={problemFor('entryType')}>
          <NativeSelect
            id="entry-type"
            ref={typeRef}
            value={draft.entryType}
            onChange={(event) => update({ entryType: event.target.value as EntryType | '' })}
            aria-invalid={problemFor('entryType') ? true : undefined}
            aria-describedby={problemFor('entryType') ? 'entry-type-error' : undefined}
            disabled={add.isPending}
            className="sm:max-w-xs"
          >
            {draft.entryType === '' && <option value="">Choose…</option>}
            {ENTRY_TYPES.map((type) => (
              <option key={type} value={type}>
                {ENTRY_TYPE_LABELS[type]}
              </option>
            ))}
          </NativeSelect>
        </Field>

        {/* The four sections as one group: "at least one" is a rule about
            the GROUP, so its message belongs to the fieldset. */}
        <fieldset
          className="space-y-4"
          aria-describedby={problemFor('sections') ? 'sections-error' : 'sections-hint'}
        >
          <legend className="text-sm font-medium">Note</legend>
          <p id="sections-hint" className="text-sm text-muted-foreground">
            Fill in the sections that apply — at least one.
          </p>
          {problemFor('sections') && (
            <p id="sections-error" className="text-sm text-destructive">
              {problemFor('sections')}
            </p>
          )}
          {SECTIONS.map((section, index) => (
            <div key={section} className="space-y-1.5">
              <Label htmlFor={`section-${section}`}>{SECTION_LABELS.practitioner[section]}</Label>
              <p id={`section-${section}-hint`} className="text-xs text-muted-foreground">
                {SECTION_HINTS[section]}
              </p>
              <Textarea
                id={`section-${section}`}
                ref={index === 0 ? firstSectionRef : undefined}
                value={draft[section]}
                onChange={(event) => update({ [section]: event.target.value })}
                maxLength={SECTION_MAX_LENGTH}
                rows={4}
                aria-describedby={`section-${section}-hint`}
                disabled={add.isPending}
              />
            </div>
          ))}
        </fieldset>

        {original && (
          <Field id="amendment-reason" label="Why are you amending it?" error={problemFor('reason')}>
            <Textarea
              id="amendment-reason"
              ref={reasonRef}
              value={draft.reason}
              onChange={(event) => update({ reason: event.target.value })}
              maxLength={REASON_MAX_LENGTH}
              rows={2}
              aria-invalid={problemFor('reason') ? true : undefined}
              aria-describedby={problemFor('reason') ? 'amendment-reason-error' : undefined}
              disabled={add.isPending}
            />
          </Field>
        )}

        {add.isError && (
          <p role="alert" className="text-sm text-destructive">
            {describeFailure("Couldn't save the entry", add.error)}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={add.isPending}>
            {add.isPending ? 'Saving…' : original ? 'Save the amendment' : 'Save the entry'}
          </Button>
          <BackToFile patientId={patientId} label="Cancel" />
        </div>
      </form>
    </Page>
  )
}

// A label, the control, and — after a refused Save — the message under it,
// tied to the control by `aria-describedby` (the control sets it).
function Field({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error: string | undefined
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

function BackToFile({ patientId, label = 'Back to the medical file' }: { patientId: number; label?: string }) {
  return (
    <Link to={medicalFilePath(patientId)} className="text-sm underline underline-offset-4">
      {label}
    </Link>
  )
}

// The entry to amend can't be shown. Both possibilities, and the way back to
// the file the practitioner was working in (the shared shape,
// common/NotAvailable — 2026-10-23).
function EntryNotAvailable({ patientId }: { patientId: number }) {
  return (
    <NotAvailable
      title="Entry not available"
      links={[{ to: medicalFilePath(patientId), label: 'Back to the medical file' }]}
    >
      This entry doesn't exist, or it isn't in this patient's medical file.
    </NotAvailable>
  )
}

function Page({ children }: { children: ReactNode }) {
  return <div className="mx-auto mt-8 max-w-2xl space-y-6 px-4 pb-8">{children}</div>
}