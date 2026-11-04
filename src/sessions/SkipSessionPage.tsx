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

import { type Ref, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { localDateString } from '@/common/calendarDate'
import { useRetryFocus } from '@/common/useRetryFocus'
import { workoutNames } from '@/assigned-programs/programSchedule'
import { useAssignedProgram } from '@/assigned-programs/useAssignedProgram'
import { useAssignedProgramSummary } from '@/assigned-programs/useAssignedProgramSummary'
import type { AssignedProgramDetail } from '@/assigned-programs/types'
import { describeFailure } from '@/workouts/useWorkoutEditing'
import { skipSession } from './api'
import { skipBody } from './endingRules'
import { ReasonPicker } from './ReasonPicker'
import { ScoreScale } from './ScoreScale'
import { EndNoteField, HomeLink, LoadFailed, Loading, NotAvailable, Page } from './SessionPageParts'
import { ENDING_NOTICE } from './sessionText'
import { skippableWorkout } from './startRules'
import type { PatientEndReason } from './types'
import { useSessionWrite } from './useSessionWrite'
import { showSuccess } from '@/snackbars/snackbarStore'

// "Skip today" — `/patient/sessions/skip/:programId` (pass (c), decided
// 2026-10-16), from the home's DUE rows. Like the start page, the address
// names only the program, and whether today can be skipped is worked out
// again here by the home's own rule (skippableWorkout → todayStatus), so a
// stale link can't skip the wrong day.
//
// A skip is recorded, with the patient's reason (required) and an optional
// note; a pain level only when pain is the reason (the backend refuses it
// otherwise — "skipped, no time — 7/10" would be a number nobody asked
// for). The day is still MISSED for the schedule; the skip is its label.
export function SkipSessionPage() {
  const { programId: param } = useParams<{ programId: string }>()
  const programId = Number(param)
  if (!Number.isInteger(programId) || programId < 1) {
    return (
      <Page>
        <NotAvailable what="program" />
      </Page>
    )
  }
  return <SkipView programId={programId} />
}

function SkipView({ programId }: { programId: number }) {
  const [today] = useState(() => localDateString())
  const program = useAssignedProgram(programId)
  const summary = useAssignedProgramSummary(programId, today, {
    enabled: program.isSuccess,
    fresh: true,
  })
  // After a "Try again" that worked, focus goes to the heading the page then
  // shows (either takes this ref) — once READY, as the loading state says.
  const ready = program.isSuccess && summary.isSuccess && summary.isFetchedAfterMount
  const heading = useRetryFocus<HTMLHeadingElement>('this program', ready)

  if (program.isError || summary.isError) {
    return (
      <Page>
        <LoadFailed what="program" queries={[program, summary]} />
      </Page>
    )
  }
  // The DECISION waits for this visit's own answer (`isFetchedAfterMount`),
  // never a cached one — found in the live check: a summary cached while a
  // session was open sent the patient back to that session after it was
  // stopped. Only the FIRST answer is waited for: a later background refetch
  // (the window regaining focus) updates the page in place, rather than
  // unmounting the form and losing what the patient chose.
  if (!program.isSuccess || !summary.isSuccess || !summary.isFetchedAfterMount) {
    return (
      <Page>
        <Loading />
      </Page>
    )
  }

  const workoutId = skippableWorkout(summary.data, today)
  if (workoutId === null) {
    return (
      <Page>
        <h1 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">
          {program.data.title}
        </h1>
        <p>There is no scheduled session to skip today.</p>
        <HomeLink />
      </Page>
    )
  }
  return <SkipForm program={program.data} workoutId={workoutId} today={today} heading={heading} />
}

function SkipForm({
  program,
  workoutId,
  today,
  heading,
}: {
  program: AssignedProgramDetail
  workoutId: number
  today: string
  heading: Ref<HTMLHeadingElement>
}) {
  const navigate = useNavigate()
  const [reason, setReason] = useState<PatientEndReason | null>(null)
  const [note, setNote] = useState('')
  const [painBefore, setPainBefore] = useState<number | null>(null)
  const [missingReason, setMissingReason] = useState(false)
  const reasonRef = useRef<HTMLDivElement>(null)
  // Home with a snackbar (decisions §33), replacing this page.
  const skip = useSessionWrite(skipSession, () => {
    showSuccess(ENDING_NOTICE.skipped)
    void navigate('/patient', { replace: true })
  })
  const names = workoutNames(program.workouts)

  function onSkip() {
    if (reason === null) {
      setMissingReason(true)
      reasonRef.current?.querySelector('input')?.focus()
      return
    }
    skip.mutate(skipBody(program.id, today, reason, note, painBefore))
  }

  return (
    <Page>
      <div className="space-y-1">
        <h1 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">
          Skip today's session
        </h1>
        <p className="font-medium">
          {program.title}
          {names.several && `: ${names.labelOf(workoutId)}`}
        </p>
        <p className="text-sm">
          Your practitioner will see that you skipped it, and why.
        </p>
      </div>

      <div ref={reasonRef}>
        <ReasonPicker
          legend="Why are you skipping today?"
          value={reason}
          onChange={(next) => {
            setReason(next)
            setMissingReason(false)
          }}
          error={missingReason ? 'Choose a reason first.' : null}
          disabled={skip.isPending}
        />
      </div>

      {/* Only for pain: the level that made the patient skip. (Chosen, then
          another reason picked: the question goes away, and the level isn't
          sent — skipBody.) */}
      {reason === 'pain' && (
        <ScoreScale
          legend="How much pain do you have right now?"
          lowLabel="no pain"
          highLabel="worst pain imaginable"
          value={painBefore}
          onChange={setPainBefore}
          disabled={skip.isPending}
        />
      )}

      <EndNoteField value={note} onChange={setNote} disabled={skip.isPending} />

      {skip.isError && (
        <p role="alert" className="text-sm text-destructive">
          {describeFailure("Couldn't skip today's session", skip.error)}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" disabled={skip.isPending} onClick={onSkip}>
          {skip.isPending ? 'Skipping…' : 'Skip today'}
        </Button>
        <HomeLink />
      </div>
    </Page>
  )
}