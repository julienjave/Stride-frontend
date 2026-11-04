/*
    Copyright 2026 Julien Javelaud

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
// -----------------------------------------------------------------------------------------------------------

import type { Ref } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { YoursBadge } from '@/common/YoursBadge'
import { formatCalendarDate } from '@/common/formatCalendarDate'
import { PROGRAM_STATUS_LABELS } from '@/patients/patientPageRules'
import { DEACTIVATED_ASSIGN_AGAIN_TEXT, DEACTIVATED_PROGRAM_TEXT, programLock } from './programLock'
import { StateBadge } from './StateBadge'
import type { Tone } from './progressText'
import type { AssignedProgramDetail, AssignedProgramListItem } from './types'

interface ProgramHeaderProps {
  program: AssignedProgramDetail
  // Whether the program is paused today (the version in force is a pause)
  // — worked out by the page, which already knows the versions.
  isPaused: boolean
  // The patient's name, date of birth and whether their account is active,
  // once loaded (null until then: the header shows what it can without them
  // rather than waiting).
  patient: { name: string; dateOfBirth: string | null; isActive: boolean } | null
  // The patient's programs (GET /assigned-programs?patientId=), once
  // loaded: the only response that says WHO assigned a program (`assigner`),
  // and it lists the programs this one continues or is continued in. Often
  // already cached — the practitioner usually comes from the patient page.
  patientPrograms: readonly AssignedProgramListItem[] | undefined
  myId: number
  // The page's focus target after a "Try again" that worked (useRetryFocus).
  headingRef: Ref<HTMLHeadingElement>
}

// The program's state in one word: a deleted (archived) program first —
// whatever its status says, it's gone; then a pause, which is how an active
// program can be "on hold" (a schedule version since step 2b-ii, not a
// status); then the status itself.
function stateBadge(program: AssignedProgramDetail, isPaused: boolean): { label: string; tone: Tone } {
  if (program.isArchived) return { label: 'Deleted', tone: 'neutral' }
  if (program.status === 'active' && isPaused) return { label: 'Paused', tone: 'pending' }
  return {
    label: PROGRAM_STATUS_LABELS[program.status],
    tone: program.status === 'active' ? 'good' : 'neutral',
  }
}

// The top of the program page: whose program it is, its state, its dates,
// who assigned it, and where it comes from or went on to ("Assign again").
// On a closed or deleted program, a notice says it can't change any more —
// the backend refuses every write on it (409), so the page says so first.
export function ProgramHeader({
  program,
  isPaused,
  patient,
  patientPrograms,
  myId,
  headingRef,
}: ProgramHeaderProps) {
  const patientPath = `/practitioner/patients/${program.patientId}`
  const badge = stateBadge(program, isPaused)
  const isMine = program.assignedBy === myId

  // This program's own list row carries its assigner; the program it
  // continues and the ones continuing it are rows of the same list.
  const ownRow = patientPrograms?.find((row) => row.id === program.id)
  const source =
    program.basedOnProgramId === null
      ? null
      : patientPrograms?.find((row) => row.id === program.basedOnProgramId)
  const continuations = patientPrograms?.filter((row) => row.basedOnProgramId === program.id) ?? []

  return (
    <div className="space-y-3">
      {/* Back to the patient: the program's natural parent (their page
          lists every program they have). The name, once known. */}
      <Link to={patientPath} className="text-sm text-muted-foreground hover:underline">
        ← {patient?.name ?? 'Patient'}
      </Link>

      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 ref={headingRef} tabIndex={-1} className="min-w-0 text-xl font-semibold outline-none">
            {program.title}
          </h1>
          {isMine && <YoursBadge />}
          <StateBadge {...badge} />
        </div>

        {/* Name AND date of birth: two identifiers, so a program for one of
            two same-name patients can't be mistaken for the other's (the
            assign form's rule, 3a-1). */}
        {patient && (
          <p className="text-sm">
            For{' '}
            <Link to={patientPath} className="font-medium underline">
              {patient.name}
            </Link>
            {patient.dateOfBirth && `, born ${formatCalendarDate(patient.dateOfBirth)}`}
          </p>
        )}

        {/* Calendar dates (`date` columns): formatCalendarDate, never shifted
            by the viewer's time zone. */}
        <p className="text-sm text-muted-foreground">
          {program.endDate
            ? `${formatCalendarDate(program.startDate)} – ${formatCalendarDate(program.endDate)}`
            : `From ${formatCalendarDate(program.startDate)}, no end date`}
        </p>

        {/* "you" for my own (no need to read my own name); a colleague's
            name otherwise — whom to talk to before changing anything. */}
        {isMine ? (
          <p className="text-sm text-muted-foreground">Assigned by you</p>
        ) : (
          ownRow?.assigner && (
            <p className="text-sm text-muted-foreground">
              Assigned by {ownRow.assigner.firstName} {ownRow.assigner.lastName}
            </p>
          )
        )}

        {program.basedOnProgramId !== null && (
          <p className="text-sm text-muted-foreground">
            Continues{' '}
            <Link
              to={`/practitioner/programs/assigned/${program.basedOnProgramId}`}
              className="font-medium text-foreground underline"
            >
              {/* The title once the list has it; a description meanwhile,
                  or if the list couldn't be loaded. */}
              {source?.title ?? 'an earlier program'}
            </Link>
            {source?.endDate &&
              ` (${PROGRAM_STATUS_LABELS[source.status].toLowerCase()}, ended ${formatCalendarDate(source.endDate)})`}
          </p>
        )}

        {continuations.map((next) => (
          <p key={next.id} className="text-sm text-muted-foreground">
            Continued in{' '}
            <Link
              to={`/practitioner/programs/assigned/${next.id}`}
              className="font-medium text-foreground underline"
            >
              {next.title}
            </Link>
          </p>
        ))}
      </div>

      <ClosedNotice program={program} patientActive={patient?.isActive} />
      {programLock(program, patient?.isActive) === 'patient_deactivated' && (
        // An open program of a deactivated patient (decisions §22): the
        // same standing-state box as a closed one — why the page has no
        // controls, and what it still allows (Complete / Cancel, below).
        <p className="rounded-md border bg-muted p-3 text-sm">{DEACTIVATED_PROGRAM_TEXT}</p>
      )}
    </div>
  )
}

// Why nothing on the page can change: the program is deleted, or closed.
// Plain text in a box, not an alert — it's the page's standing state, not
// news (role="alert" would interrupt a screen reader on every visit).
// A completed or cancelled program can be continued: "Assign again" opens the
// assign form with it as the source (decided 2026-10-11 — never reopened in
// place, which would bring back weeks already judged). Not a deleted one:
// nothing happened in it to continue (the backend refuses it, 400).
//
// "Assign again" is a NEW program for the patient, so a deactivated
// patient's closed program says when it will be possible instead (the
// backend refuses it — 409, decisions §22).
function ClosedNotice({
  program,
  patientActive,
}: {
  program: AssignedProgramDetail
  patientActive: boolean | undefined
}) {
  let text: string | null = null
  if (program.isArchived) {
    // Archived = cancelled (or deleted) before any session: nothing happened
    // clinically, so it was removed from every list (decisions §5, 2b-iii).
    text =
      'This program was deleted before any session was done. It no longer appears in any list and can no longer change.'
  } else if (program.status !== 'active') {
    const verb = program.status === 'completed' ? 'Completed' : 'Cancelled'
    // Closing always gives a program an end date (the backend's
    // closingEndDate), so the second wording can't be reached today; it's
    // there because the TYPE allows a null end date, and a screen must
    // never say "ended on null".
    text = program.endDate
      ? `${verb}: this program ended on ${formatCalendarDate(program.endDate)} and is now read-only.`
      : `${verb}: this program is now read-only.`
  }
  if (!text) return null
  const canContinue = !program.isArchived
  const patientDeactivated = patientActive === false
  return (
    <div className="space-y-2 rounded-md border bg-muted p-3 text-sm">
      <p>{text}</p>
      {canContinue && patientDeactivated && <p>{DEACTIVATED_ASSIGN_AGAIN_TEXT}</p>}
      {canContinue && !patientDeactivated && (
        <Button asChild size="sm" variant="outline">
          <Link to={`/practitioner/programs/assigned/new?basedOnProgramId=${program.id}`}>
            Assign again
          </Link>
        </Button>
      )}
    </div>
  )
}