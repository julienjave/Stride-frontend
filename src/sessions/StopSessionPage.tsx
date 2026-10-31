import { type Ref, useRef, useState } from 'react'
import { useRetryFocus } from '@/common/useRetryFocus'
import { Link, useNavigate, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { describeFailure } from '@/workouts/useWorkoutEditing'
import { stopSession } from './api'
import { stopBody } from './endingRules'
import { ReasonPicker } from './ReasonPicker'
import { ScoreScale } from './ScoreScale'
import {
  EndNoteField,
  LoadFailed,
  Loading,
  NotAvailable,
  Page,
  SessionAlreadyEnded,
} from './SessionPageParts'
import { ENDING_NOTICE, checklistProgressText } from './sessionText'
import type { PatientEndReason, Session } from './types'
import { useSession } from './useSession'
import { useSessionWrite } from './useSessionWrite'
import { showSuccess } from '@/snackbars/snackbarStore'

// Stop — `/patient/sessions/:sessionId/stop` (pass (c), decided 2026-10-16).
// Ending a session before finishing it: it becomes `incomplete`, kept as
// "not finished", with the patient's REASON (required — a category the
// practitioner's alerts can find), an optional note, and the optional
// check-out: pain and mobility matter most for someone stopping because it
// hurts, but they may stop for another reason (the person's point,
// 2026-10-15).
//
// Any open session can be stopped — one left open on an EARLIER day too
// (Finish can't reach it: completing happens on a session's own day).
export function StopSessionPage() {
  const { sessionId: param } = useParams<{ sessionId: string }>()
  const sessionId = Number(param)
  if (!Number.isInteger(sessionId) || sessionId < 1) {
    return (
      <Page>
        <NotAvailable what="session" />
      </Page>
    )
  }
  return <StopView sessionId={sessionId} />
}

function StopView({ sessionId }: { sessionId: number }) {
  const session = useSession(sessionId)
  // After a "Try again" that worked, focus goes to the heading of whatever
  // the page then shows — the form or "already ended"; both take this ref
  // (the start page's pattern: the hook above the branches, `shown` when
  // the session has arrived).
  const heading = useRetryFocus<HTMLHeadingElement>('this session', session.isSuccess)

  if (session.isError) {
    return (
      <Page>
        <LoadFailed what="session" queries={[session]} />
      </Page>
    )
  }
  if (!session.isSuccess) {
    return (
      <Page>
        <Loading />
      </Page>
    )
  }
  if (session.data.status !== 'in_progress') {
    return (
      <Page>
        <SessionAlreadyEnded session={session.data} heading={heading} />
      </Page>
    )
  }
  return <StopForm session={session.data} heading={heading} />
}

function StopForm({ session, heading }: { session: Session; heading: Ref<HTMLHeadingElement> }) {
  const navigate = useNavigate()
  const [reason, setReason] = useState<PatientEndReason | null>(null)
  const [note, setNote] = useState('')
  const [painAfter, setPainAfter] = useState<number | null>(null)
  const [mobilityAfter, setMobilityAfter] = useState<number | null>(null)
  // "Stop" pressed with no reason: say so, and take the patient to the
  // question (focus on its first choice).
  const [missingReason, setMissingReason] = useState(false)
  const reasonRef = useRef<HTMLDivElement>(null)
  const stop = useSessionWrite(
    (body: ReturnType<typeof stopBody>) => stopSession(session.id, body),
    // Home with a snackbar (decisions §33), replacing this page.
    () => {
      showSuccess(ENDING_NOTICE.stopped)
      void navigate('/patient', { replace: true })
    },
  )

  function onStop() {
    if (reason === null) {
      setMissingReason(true)
      reasonRef.current?.querySelector('input')?.focus()
      return
    }
    stop.mutate(stopBody(reason, note, { painAfter, mobilityAfter }))
  }

  return (
    <Page>
      <div className="space-y-1">
        <h1 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">
          Stop your session
        </h1>
        <p className="text-sm text-muted-foreground">{checklistProgressText(session.exercises)}</p>
        <p className="text-sm">
          The session will be kept as not finished, with what you did so far.
        </p>
      </div>

      <div ref={reasonRef}>
        <ReasonPicker
          legend="Why are you stopping?"
          value={reason}
          onChange={(next) => {
            setReason(next)
            setMissingReason(false)
          }}
          error={missingReason ? 'Choose a reason first.' : null}
          disabled={stop.isPending}
        />
      </div>

      <EndNoteField value={note} onChange={setNote} disabled={stop.isPending} />

      <ScoreScale
        legend="How much pain do you have now?"
        lowLabel="no pain"
        highLabel="worst pain imaginable"
        value={painAfter}
        onChange={setPainAfter}
        disabled={stop.isPending}
      />
      <ScoreScale
        legend="How freely can you move now?"
        lowLabel="not at all"
        highLabel="completely freely"
        value={mobilityAfter}
        onChange={setMobilityAfter}
        disabled={stop.isPending}
      />

      {stop.isError && (
        <p role="alert" className="text-sm text-destructive">
          {describeFailure("Couldn't stop the session", stop.error)}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" variant="destructive" disabled={stop.isPending} onClick={onStop}>
          {stop.isPending ? 'Stopping…' : 'Stop session'}
        </Button>
        <Link
          to={`/patient/sessions/${session.id}`}
          className="text-sm underline underline-offset-4"
        >
          Back to the session
        </Link>
      </div>
    </Page>
  )
}