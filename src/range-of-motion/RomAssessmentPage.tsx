import { type FormEvent, type ReactNode, type Ref, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { validationMessages } from '@/api/apiErrors'
import { localDateString } from '@/common/calendarDate'
import { LoadError, LoadFailure } from '@/common/LoadError'
import { Loading } from '@/common/Loading'
import { NativeSelect } from '@/common/NativeSelect'
import { NotAvailable } from '@/common/NotAvailable'
import { useRetryFocus } from '@/common/useRetryFocus'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { groupIntoNotes } from '@/medical-files/medicalFileRules'
import { entryHeading } from '@/medical-files/medicalFileText'
import type { MedicalFileEntry } from '@/medical-files/types'
import { useMedicalFile } from '@/medical-files/useMedicalFile'
import { showSuccess } from '@/snackbars/snackbarStore'
import { useUser } from '@/users/useUser'
import { describeFailure } from '@/workouts/useWorkoutEditing'
import {
  MEASURED_ON_ID,
  MEASUREMENTS_ID,
  NOTE_MAX_LENGTH,
  NOTE_SELECT_ID,
  REASON_ID,
  REASON_MAX_LENGTH,
  assessmentBody,
  boxFieldId,
  boxesOf,
  draftFrom,
  draftProblems,
  emptyDraft,
  emptyRow,
  movementFieldId,
  nextRowKey,
  noteFieldId,
  serverProblems,
  type AssessmentDraft,
  type BoxDraft,
  type BoxKey,
  type DraftProblem,
  type RowDraft,
} from './romDraft'
import { rangeOfMotionPath, romAssessmentPath } from './romPaths'
import { indexCatalogue, type CatalogueIndex } from './romRules'
import { MODE_LABELS, SIDE_LABELS, assessmentHeading, typicalText } from './romText'
import { ROM_MODES, type MovementCatalogue, type RomAssessment, type RomMode } from './types'
import { useMovementCatalogue, useRecordRomAssessment, useRomAssessment } from './useRangeOfMotion'

// Recording range of motion —
// `/practitioner/patients/:id/range-of-motion/new` (Phase 7, decisions §36):
// its own page, like the medical file's entry form. With `?amends=<id>` it
// records an AMENDMENT of that version (the form starts as a copy of it, a
// reason is required); with `?note=<entryId>` — "Record measurements for this
// visit", from a medical file entry — that note is already chosen. Saving
// returns to the range-of-motion page, REPLACING this one in the history.
//
// THE FORM (the person's choice): the day measured, the visit note, then
// MOVEMENT ROWS — a movement, a mode, a Left and a Right box (one box for a
// movement with no side), the typical value beside the row, a note per value
// behind a small button; "+ Add a movement". Each filled box is one value.
export function RomAssessmentPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const patientId = Number(id)
  const amendsId = idParam(searchParams.get('amends'))
  const noteId = idParam(searchParams.get('note'))

  if (!Number.isInteger(patientId) || patientId < 1) {
    return (
      <Page>
        <p className="text-sm text-destructive">This address isn't valid.</p>
      </Page>
    )
  }
  // An assessment id that isn't a number can't be an assessment: the same
  // words as one that doesn't exist (they reveal nothing a typed id couldn't).
  if (amendsId === 'invalid') {
    return (
      <Page>
        <AssessmentNotAvailable patientId={patientId} />
      </Page>
    )
  }
  return amendsId === null ? (
    // A `note` that isn't an id is simply not used: the form opens with no
    // note chosen (choosing one is optional anyway).
    <AssessmentForm key="new" patientId={patientId} initialNoteId={typeof noteId === 'number' ? noteId : null} />
  ) : (
    <AmendView key={amendsId} patientId={patientId} amendsId={amendsId} />
  )
}

// A query parameter that should hold an id: absent → null, a positive whole
// number → that number, anything else → 'invalid'.
function idParam(value: string | null): number | null | 'invalid' {
  if (value === null) return null
  const number = Number(value)
  return Number.isInteger(number) && number >= 1 ? number : 'invalid'
}

// Amending: the version to correct is read first (GET /range-of-motion/:id,
// itself an audited read — the practitioner is about to rewrite it). The
// states of the medical file's AmendView, one for one.
function AmendView({ patientId, amendsId }: { patientId: number; amendsId: number }) {
  const assessment = useRomAssessment(patientId, amendsId)
  const heading = useRetryFocus<HTMLHeadingElement>('the assessment', assessment.isSuccess)

  if (assessment.isError) {
    return (
      <Page>
        <LoadFailure
          queries={[assessment]}
          what="the assessment"
          notAvailable={<AssessmentNotAvailable patientId={patientId} />}
        >
          <BackToRecord patientId={patientId} />
        </LoadFailure>
      </Page>
    )
  }
  // Another patient's assessment under this patient's address: not amended
  // here (the backend would refuse it anyway).
  if (assessment.isSuccess && assessment.data.patientId !== patientId) {
    return (
      <Page>
        <AssessmentNotAvailable patientId={patientId} />
      </Page>
    )
  }
  if (!assessment.isSuccess) {
    return (
      <Page>
        <Loading label="Loading the assessment…" />
      </Page>
    )
  }
  if (assessment.data.amendedById !== null) {
    // Corrected already (an old link, or a colleague a moment ago): amend
    // the newer version — a chain, never a branch (the backend's 409).
    return (
      <Page>
        <h1 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">
          This assessment has been amended since
        </h1>
        <p className="text-sm">
          A newer version replaces it. Amend that version instead, so the corrections stay in order.
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <Link
            to={romAssessmentPath(patientId, { amends: assessment.data.amendedById })}
            className="font-medium underline underline-offset-4"
          >
            Amend the newer version
          </Link>
          <BackToRecord patientId={patientId} />
        </div>
      </Page>
    )
  }
  return (
    <AssessmentForm patientId={patientId} original={assessment.data} headingRef={heading} initialNoteId={null} />
  )
}

// The form needs the CATALOGUE before anything (the picker, the boxes, the
// bounds): until it has it, a loading line; if it can't have it, "Try
// again".
function AssessmentForm(props: {
  patientId: number
  original?: RomAssessment
  headingRef?: Ref<HTMLHeadingElement>
  initialNoteId: number | null
}) {
  const catalogue = useMovementCatalogue()
  if (catalogue.isError) {
    return (
      <Page>
        <LoadError what="the list of movements" queries={[catalogue]}>
          <BackToRecord patientId={props.patientId} />
        </LoadError>
      </Page>
    )
  }
  if (!catalogue.isSuccess) {
    return (
      <Page>
        <Loading label="Loading the movements…" />
      </Page>
    )
  }
  return <FormBody {...props} catalogue={catalogue.data} />
}

function FormBody({
  patientId,
  original,
  headingRef,
  initialNoteId,
  catalogue,
}: {
  patientId: number
  original?: RomAssessment
  headingRef?: Ref<HTMLHeadingElement>
  initialNoteId: number | null
  catalogue: MovementCatalogue
}) {
  const navigate = useNavigate()
  const patient = useUser(patientId)
  const name = patient.data ? `${patient.data.firstName} ${patient.data.lastName}` : null
  // The visit note's choices: the patient's medical file (an audited read —
  // the select shows each note's type and day).
  const notes = useMedicalFile(patientId)
  const index = indexCatalogue(catalogue)
  // "Today" in the viewer's zone, fixed for the life of the form: the date
  // field's latest day and the check against the future.
  const [today] = useState(() => localDateString())
  const [draft, setDraft] = useState<AssessmentDraft>(() =>
    original ? draftFrom(original) : emptyDraft(today, initialNoteId === null ? '' : String(initialNoteId)),
  )
  // The problems found when Save was last pressed (or the backend's, mapped
  // back to their boxes) — shown at their fields until the next press.
  const [problems, setProblems] = useState<DraftProblem[]>([])
  // The backend's messages that belong to no single box.
  const [general, setGeneral] = useState<string[]>([])
  const record = useRecordRomAssessment(patientId)

  // A field to focus once the page has been drawn again: a row just added
  // (its picker doesn't exist yet when the click is handled), a field the
  // BACKEND refused (the mutation's onError runs while the fields are still
  // DISABLED — a disabled field can't take the focus: focusing it there
  // failed, found by this page's test). An effect runs after React has
  // drawn the page again — by then the request is over and the fields are
  // enabled.
  //
  // A REQUEST object, not the id itself: each request is a new object, so
  // asking for the same field twice still changes the effect's dependency
  // and runs it again. (It used to be the id, set back to null inside the
  // effect for that reason — a state update in an effect, which costs a
  // second render for nothing; React's lint refuses it.)
  const [focusRequest, setFocusRequest] = useState<{ id: string } | null>(null)
  useEffect(() => {
    if (focusRequest !== null) document.getElementById(focusRequest.id)?.focus()
  }, [focusRequest])
  const focusAfterRender = (id: string) => setFocusRequest({ id })

  function problemFor(field: string): string | undefined {
    return problems.find((problem) => problem.field === field)?.message
  }

  // The first problem's field gets the focus. "At least one measurement" is
  // about the whole list: its first movement picker takes it.
  function focusField(field: string) {
    const target = field === MEASUREMENTS_ID ? movementFieldId(draft.rows[0].key) : field
    document.getElementById(target)?.focus()
  }

  function update(changes: Partial<AssessmentDraft>) {
    setDraft((current) => ({ ...current, ...changes }))
  }

  function updateRow(key: number, change: (row: RowDraft) => RowDraft) {
    setDraft((current) => ({ ...current, rows: current.rows.map((row) => (row.key === key ? change(row) : row)) }))
  }

  function addRow() {
    const key = nextRowKey(draft)
    setDraft((current) => ({ ...current, rows: [...current.rows, emptyRow(key)] }))
    focusAfterRender(movementFieldId(key))
  }

  function removeRow(key: number) {
    const position = draft.rows.findIndex((row) => row.key === key)
    const rest = draft.rows.filter((row) => row.key !== key)
    setDraft((current) => ({ ...current, rows: current.rows.filter((row) => row.key !== key) }))
    // Focus goes to the row that took its place (or the one before it, for
    // the last) — never lost to the page's top.
    const neighbour = rest[Math.min(position, rest.length - 1)]
    if (neighbour) focusAfterRender(movementFieldId(neighbour.key))
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    setGeneral([])
    const found = draftProblems(draft, index, today, original)
    setProblems(found)
    if (found.length > 0) {
      focusField(found[0].field)
      return
    }
    const { body, sources } = assessmentBody(draft, index, patientId, original?.id)
    record.mutate(body, {
      onSuccess: () => {
        // A snackbar (decisions §33): it outlives this page, which the
        // record REPLACES in the history.
        showSuccess(original ? 'Amendment saved.' : 'Assessment recorded.')
        void navigate(rangeOfMotionPath(patientId), { replace: true })
      },
      onError: (error) => {
        // A refused value comes back at its box; the rest above Save.
        const messages = validationMessages(error)
        if (messages === null) return
        const mapped = serverProblems(messages, sources)
        if (mapped.problems.length === 0) return
        setProblems(mapped.problems)
        setGeneral(mapped.general)
        focusAfterRender(mapped.problems[0].field)
      },
    })
  }

  // The failure line above Save: the backend's own sentence — unless every
  // message it sent was shown at a box (then only the general ones, if any).
  const mappedFailure = record.isError && problems.length > 0 && validationMessages(record.error) !== null
  const failure = !record.isError
    ? null
    : mappedFailure
      ? general.length > 0
        ? `Couldn't save the assessment. ${general.join(' ')}`
        : null
      : describeFailure("Couldn't save the assessment", record.error)

  return (
    <Page>
      <div className="space-y-1">
        <h1 ref={headingRef} tabIndex={headingRef ? -1 : undefined} className="text-xl font-semibold outline-none">
          {original ? 'Amend an assessment' : 'Record range of motion'}
        </h1>
        {name && <p className="text-sm text-muted-foreground">{name}</p>}
      </div>

      {original && (
        <p className="rounded-lg border bg-muted/40 p-3 text-sm">
          You're correcting the assessment <strong>{assessmentHeading(original).toLowerCase()}</strong> by{' '}
          {original.author.firstName} {original.author.lastName}. Your version replaces it in the record;
          the original stays, marked as amended.
        </p>
      )}

      {/* noValidate: the page checks the draft itself (draftProblems) and
          says what's wrong at each field, instead of the browser's bubbles. */}
      <form noValidate onSubmit={onSubmit} className="space-y-6">
        <Field id={MEASURED_ON_ID} label="Measured on" error={problemFor(MEASURED_ON_ID)}>
          <Input
            id={MEASURED_ON_ID}
            type="date"
            value={draft.measuredOn}
            onChange={(event) => update({ measuredOn: event.target.value })}
            // Never in the future: the picker greys out later days (the
            // check stays — a typed date isn't stopped by `max`).
            max={today}
            aria-invalid={problemFor(MEASURED_ON_ID) ? true : undefined}
            aria-describedby={problemFor(MEASURED_ON_ID) ? `${MEASURED_ON_ID}-error` : undefined}
            disabled={record.isPending}
            className="sm:max-w-xs"
          />
        </Field>

        <VisitNoteField
          notes={notes}
          value={draft.noteId}
          measuredOn={draft.measuredOn}
          onChange={(noteId) => update({ noteId })}
          disabled={record.isPending}
        />

        {/* The rows as one group: "at least one measurement" is a rule
            about the GROUP, so its message belongs to the fieldset. */}
        <fieldset
          className="space-y-4"
          aria-describedby={problemFor(MEASUREMENTS_ID) ? `${MEASUREMENTS_ID}-error` : `${MEASUREMENTS_ID}-hint`}
        >
          <legend className="text-sm font-medium">Measurements</legend>
          <p id={`${MEASUREMENTS_ID}-hint`} className="text-sm text-muted-foreground">
            In whole degrees from the neutral position — negative when the joint stops short of it (a
            knee 5° short of straight: -5). Fill in the sides you measured.
          </p>
          {problemFor(MEASUREMENTS_ID) && (
            <p id={`${MEASUREMENTS_ID}-error`} className="text-sm text-destructive">
              {problemFor(MEASUREMENTS_ID)}
            </p>
          )}
          <ol className="space-y-4">
            {draft.rows.map((row, position) => (
              <li key={row.key}>
                <MovementRow
                  row={row}
                  number={position + 1}
                  catalogue={catalogue}
                  index={index}
                  problemFor={problemFor}
                  onChange={(change) => updateRow(row.key, change)}
                  onRemove={draft.rows.length > 1 ? () => removeRow(row.key) : undefined}
                  disabled={record.isPending}
                />
              </li>
            ))}
          </ol>
          <Button type="button" variant="outline" onClick={addRow} disabled={record.isPending}>
            + Add a movement
          </Button>
        </fieldset>

        {original && (
          <Field id={REASON_ID} label="Why are you amending it?" error={problemFor(REASON_ID)}>
            <Textarea
              id={REASON_ID}
              value={draft.reason}
              onChange={(event) => update({ reason: event.target.value })}
              maxLength={REASON_MAX_LENGTH}
              rows={2}
              aria-invalid={problemFor(REASON_ID) ? true : undefined}
              aria-describedby={problemFor(REASON_ID) ? `${REASON_ID}-error` : undefined}
              disabled={record.isPending}
            />
          </Field>
        )}

        {failure && (
          <p role="alert" className="text-sm text-destructive">
            {failure}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={record.isPending}>
            {record.isPending ? 'Saving…' : original ? 'Save the amendment' : 'Save the assessment'}
          </Button>
          <BackToRecord patientId={patientId} label="Cancel" />
        </div>
      </form>
    </Page>
  )
}

// --- THE VISIT NOTE ----------------------------------------------------------

// The note of the same visit, optional: a select of the patient's notes (each
// note's LATEST version — linking a replaced one would point at a mistake),
// the ones written on the day measured first (decisions §36). A note chosen
// earlier that isn't a latest version any more (an amendment of an
// assessment linked before the note was corrected) stays a choice, said so.
function VisitNoteField({
  notes,
  value,
  measuredOn,
  onChange,
  disabled,
}: {
  notes: { data?: MedicalFileEntry[]; isError: boolean; isPending: boolean }
  value: string
  measuredOn: string
  onChange: (noteId: string) => void
  disabled: boolean
}) {
  const latest = groupIntoNotes(notes.data ?? []).map((note) => note.latest)
  const sameDay = latest.filter((entry) => localDateString(new Date(entry.createdAt)) === measuredOn)
  const others = latest.filter((entry) => !sameDay.includes(entry))
  const stale = value !== '' && !latest.some((entry) => String(entry.id) === value)
    ? notes.data?.find((entry) => String(entry.id) === value)
    : undefined
  return (
    <div className="space-y-1.5">
      <Label htmlFor={NOTE_SELECT_ID}>Visit note (optional)</Label>
      <NativeSelect
        id={NOTE_SELECT_ID}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={`${NOTE_SELECT_ID}-hint`}
        disabled={disabled || notes.isPending}
        className="sm:max-w-md"
      >
        <option value="">{notes.isPending ? 'Loading the notes…' : 'No note'}</option>
        {stale && <option value={String(stale.id)}>{`${entryHeading(stale)} (since amended)`}</option>}
        {/* An id the file doesn't hold (an old link): kept so the select
            shows what will be sent; the backend refuses it if it isn't this
            patient's note. */}
        {value !== '' && notes.data && !stale && !latest.some((entry) => String(entry.id) === value) && (
          <option value={value}>A note not in this file</option>
        )}
        {sameDay.length > 0 && (
          <optgroup label="Written that day">
            {sameDay.map((entry) => (
              <option key={entry.id} value={String(entry.id)}>
                {entryHeading(entry)}
              </option>
            ))}
          </optgroup>
        )}
        {others.length > 0 && (
          <optgroup label={sameDay.length > 0 ? 'Other notes' : 'Notes'}>
            {others.map((entry) => (
              <option key={entry.id} value={String(entry.id)}>
                {entryHeading(entry)}
              </option>
            ))}
          </optgroup>
        )}
      </NativeSelect>
      <p id={`${NOTE_SELECT_ID}-hint`} className="text-xs text-muted-foreground">
        {notes.isError
          ? "The notes couldn't be loaded. You can save without linking one."
          : 'The medical file entry of the same visit, if you wrote one.'}
      </p>
    </div>
  )
}

// --- ONE MOVEMENT ROW --------------------------------------------------------

function MovementRow({
  row,
  number,
  catalogue,
  index,
  problemFor,
  onChange,
  onRemove,
  disabled,
}: {
  row: RowDraft
  // The row's place, for its name ("Movement 2") — not its key.
  number: number
  catalogue: MovementCatalogue
  index: CatalogueIndex
  problemFor: (field: string) => string | undefined
  onChange: (change: (row: RowDraft) => RowDraft) => void
  // Absent on the only row: there is always one to type in.
  onRemove?: () => void
  disabled: boolean
}) {
  const movement = index.get(row.movement)
  const movementId = movementFieldId(row.key)
  const modeId = `rom-row-${row.key}-mode`
  const movementError = problemFor(movementId)

  function setBox(box: BoxKey, change: Partial<BoxDraft>) {
    onChange((current) => ({ ...current, boxes: { ...current.boxes, [box]: { ...current.boxes[box], ...change } } }))
  }

  return (
    // A fieldset per row, named by its legend ("Movement 2"): a screen
    // reader says which row a "Left" box belongs to.
    <fieldset className="space-y-3 rounded-lg border p-3">
      <legend className="px-1 text-sm font-medium">{`Movement ${number}`}</legend>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1 space-y-1.5">
          <Label htmlFor={movementId}>Movement</Label>
          {/* A native select with a group per joint (the accessible
              default named in the plan): the phone's own picker, the
              keyboard's type-ahead, the joints read out as groups. The
              options carry the WHOLE name ("Knee flexion"): a closed select
              shows only the chosen option, without its group. */}
          <NativeSelect
            id={movementId}
            value={row.movement}
            onChange={(event) => onChange((current) => ({ ...current, movement: event.target.value }))}
            aria-invalid={movementError ? true : undefined}
            aria-describedby={movementError ? `${movementId}-error` : undefined}
            disabled={disabled}
          >
            {row.movement === '' && <option value="">Choose…</option>}
            {catalogue.joints.map((joint) => (
              <optgroup key={joint.joint} label={joint.label}>
                {joint.movements.map((option) => (
                  <option key={option.movement} value={option.movement}>
                    {option.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </NativeSelect>
          {movementError && (
            <p id={`${movementId}-error`} className="text-sm text-destructive">
              {movementError}
            </p>
          )}
        </div>
        <div className="w-32 space-y-1.5">
          <Label htmlFor={modeId}>Mode</Label>
          <NativeSelect
            id={modeId}
            value={row.mode}
            onChange={(event) => onChange((current) => ({ ...current, mode: event.target.value as RomMode }))}
            disabled={disabled}
          >
            {ROM_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {MODE_LABELS[mode]}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-3">
        {boxesOf(movement).map((box) => (
          <ValueBox
            key={box}
            rowKey={row.key}
            box={box}
            draft={row.boxes[box]}
            error={problemFor(boxFieldId(row.key, box))}
            onChange={(change) => setBox(box, change)}
            disabled={disabled}
          />
        ))}
        {/* The typical value BESIDE the row (decisions §36): what the
            joint usually reaches, to catch a slip as it is typed. */}
        {movement && (
          <p className="self-center pt-5 text-sm text-muted-foreground">
            {typicalText(movement.typicalDegrees, 'practitioner')}
          </p>
        )}
      </div>

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="text-sm underline underline-offset-4"
          aria-label={`Remove movement ${number}`}
        >
          Remove
        </button>
      )}
    </fieldset>
  )
}

// One box: the degrees, its message, and the note behind "Add a note".
function ValueBox({
  rowKey,
  box,
  draft,
  error,
  onChange,
  disabled,
}: {
  rowKey: number
  box: BoxKey
  draft: BoxDraft
  error: string | undefined
  onChange: (change: Partial<BoxDraft>) => void
  disabled: boolean
}) {
  const id = boxFieldId(rowKey, box)
  const noteId = noteFieldId(rowKey, box)
  const label = box === 'none' ? 'Degrees' : SIDE_LABELS[box]
  return (
    <div className="w-36 space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-1">
        {/* A plain text field, not type="number": a phone's number pad
            often has no minus key, and a negative value is real data. */}
        <Input
          id={id}
          value={draft.degrees}
          onChange={(event) => onChange({ degrees: event.target.value })}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          disabled={disabled}
          className="tabular-nums"
        />
        <span aria-hidden="true" className="text-sm text-muted-foreground">
          °
        </span>
      </div>
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
      {draft.noteOpen ? (
        <div className="space-y-1">
          <Label htmlFor={noteId} className="text-xs">{`Note (${label.toLowerCase()})`}</Label>
          <Textarea
            id={noteId}
            value={draft.note}
            onChange={(event) => onChange({ note: event.target.value })}
            maxLength={NOTE_MAX_LENGTH}
            rows={2}
            disabled={disabled}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onChange({ noteOpen: true })}
          disabled={disabled}
          className="text-xs underline underline-offset-4"
          aria-label={`Add a note to ${label.toLowerCase()}`}
        >
          Add a note
        </button>
      )}
    </div>
  )
}

// --- SMALL PIECES ------------------------------------------------------------

function Field({ id, label, error, children }: { id: string; label: string; error: string | undefined; children: ReactNode }) {
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

function BackToRecord({ patientId, label = 'Back to the range of motion' }: { patientId: number; label?: string }) {
  return (
    <Link to={rangeOfMotionPath(patientId)} className="text-sm underline underline-offset-4">
      {label}
    </Link>
  )
}

function AssessmentNotAvailable({ patientId }: { patientId: number }) {
  return (
    <NotAvailable
      title="Assessment not available"
      links={[{ to: rangeOfMotionPath(patientId), label: 'Back to the range of motion' }]}
    >
      This assessment doesn't exist, or it isn't in this patient's record.
    </NotAvailable>
  )
}

function Page({ children }: { children: ReactNode }) {
  return <div className="mx-auto mt-8 max-w-2xl space-y-6 px-4">{children}</div>
}