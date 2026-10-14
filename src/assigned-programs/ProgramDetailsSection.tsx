import { z } from 'zod'
import { EditableField, ReadOnlyField } from '@/common/EditableField'
import { formatCalendarDate } from '@/common/formatCalendarDate'
import { programTitleSchema } from './assignForm'
import {
  canMoveStart,
  earliestEndDate,
  endChangeNotes,
  endDateProblem,
  startDateProblem,
  startMoveNotes,
  type DateNote,
} from './dateChange'
import { ProgramPageSection } from './ProgramPageSection'
import type { WorkoutNames } from './programSchedule'
import type { AssignedProgramDetail } from './types'
import { useUpdateAssignedProgram } from './useUpdateAssignedProgram'

interface ProgramDetailsSectionProps {
  // An OPEN program: the page draws this section only when isProgramOpen
  // (a closed one can't change — the backend refuses every write, 409).
  program: AssignedProgramDetail
  // The viewer's today, read once by the page.
  today: string
  names: WorkoutNames
}

// "Details" (step 3b-2): the program's title and dates, each an
// EditableField — the same "view → Edit → Save / Cancel" row as the
// profile's fields, which already take a `save` (what saving means) and a
// zod `schema` (what's valid). The page says what each means; the rules
// live in dateChange.ts.
//
// One PATCH hook for the three fields (useUpdateAssignedProgram): each
// field's `save` calls it with ONE key, so a PATCH changes exactly that
// field. EditableField runs its own mutation around `save` — its own
// "Saving…" and error per field — and the hook does the cache work.
// mutateAsync (not mutate) because EditableField needs a PROMISE: it learns
// from it when saving finished or failed.
export function ProgramDetailsSection({ program, today, names }: ProgramDetailsSectionProps) {
  const update = useUpdateAssignedProgram(program.id)

  // The dates' schemas are built per render, from the program as it is
  // now: their rules depend on it (the end date, the planned pauses) and on
  // today. A zod schema is a plain object — cheap to build. superRefine
  // reports the ONE problem the rule finds, with its message; EditableField
  // shows the first issue.
  const startSchema = z.string().superRefine((value, ctx) => {
    const problem = startDateProblem(value, program, today)
    if (problem) ctx.addIssue({ code: 'custom', message: problem })
  })
  const endSchema = z.string().superRefine((value, ctx) => {
    const problem = endDateProblem(value, program, today)
    if (problem) ctx.addIssue({ code: 'custom', message: problem })
  })

  return (
    <ProgramPageSection title="Details">
      <div className="divide-y divide-border rounded-lg border px-4">
        <EditableField
          label="Title"
          value={program.title}
          // trim, not blank, at most 200 — the assign form's rule, and the
          // backend's (it refuses a blank title since this step).
          schema={programTitleSchema}
          // The schema refuses '' (a title is required), so `value` is never
          // null here; `?? ''` only satisfies the type, and the backend
          // would refuse '' anyway.
          save={(value) => update.mutateAsync({ title: value ?? '' })}
        />

        {canMoveStart(program, today) ? (
          <EditableField
            label="Start date"
            value={program.startDate}
            schema={startSchema}
            inputType="date"
            formatValue={formatCalendarDate}
            min={today}
            max={program.endDate ?? undefined}
            // Said before saving: the schedule moves with the start, and
            // what will never apply. Only for a value the rules accept — a
            // note about a refused day would describe something that can't
            // happen.
            describeDraft={(draft) =>
              startDateProblem(draft, program, today) === null ? (
                <DateNotes notes={startMoveNotes(program, draft, names)} tone="info" />
              ) : null
            }
            save={(value) => update.mutateAsync({ startDate: value ?? '' })}
          />
        ) : (
          <ReadOnlyField
            label="Start date"
            value={program.startDate}
            formatValue={formatCalendarDate}
            // Why, and what to do instead (decisions §5, step 1b: "a typo in
            // a started program: cancel it and assign it again").
            note="It can't change once the program has started: its weeks are counted from it. To start over on another day, cancel the program and assign it again."
          />
        )}

        <EditableField
          label="End date"
          value={program.endDate}
          schema={endSchema}
          inputType="date"
          formatValue={formatCalendarDate}
          min={earliestEndDate(program, today)}
          emptyText="No end date"
          // Open-ended again: always allowed (it only adds days to come).
          clearLabel="Remove end date"
          // Said before saving: what a SHORTER end cuts off. An empty draft
          // means "no end date" (the schema accepts it, saved as null).
          describeDraft={(draft) =>
            endDateProblem(draft, program, today) === null ? (
              <DateNotes
                notes={endChangeNotes(program, draft === '' ? null : draft, names)}
                tone="warning"
              />
            ) : null
          }
          save={(value) => update.mutateAsync({ endDate: value })}
        />
      </div>
    </ProgramPageSection>
  )
}

// The notes, in a box: neutral for a start move (it's what the practitioner
// asked for, told in full), amber for a shorter end (something is cut off —
// the schedule editor's "Saving replaces…" box, same classes: a translucent
// amber that reads in both themes). Nothing at all when
// there's nothing to say: the live region around it stays, empty.
function DateNotes({ notes, tone }: { notes: DateNote[]; tone: 'info' | 'warning' }) {
  if (notes.length === 0) return null
  const style =
    tone === 'warning'
      ? 'border-amber-600/40 bg-amber-500/10'
      : 'bg-muted'
  return (
    <div className={`space-y-2 rounded-md border p-3 text-sm ${style}`}>
      {notes.map((note) => (
        <div key={note.text}>
          <p>{note.text}</p>
          {note.items.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {note.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}