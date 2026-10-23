import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { localDateString } from '@/common/calendarDate'
import { workoutNames } from '@/assigned-programs/programSchedule'
import { useAssignedProgram } from '@/assigned-programs/useAssignedProgram'
import { describeFailure } from '@/workouts/useWorkoutEditing'
import { completeSession } from './api'
import { completeBody } from './endingRules'
import { FEEDBACK_MAX_LENGTH } from './sessionRules'
import { ScoreScale } from './ScoreScale'
import { LoadFailed, Loading, NotAvailable, Page } from './SessionPageParts'
import { ENDING_NOTICE, checklistProgressText, untickedText } from './sessionText'
import type { Session } from './types'
import { useSession } from './useSession'
import { useSessionWrite } from './useSessionWrite'

// Finish — `/patient/sessions/:sessionId/finish` (pass (c), decided
// 2026-10-16). A ROUTE, not a dialog: a phone's Back button leaves it like
// any page, and a reload keeps it.
//
// A completed session is FINAL (Phase 4 step 1): this page is where the
// patient reviews — how much is ticked, the optional check-out (pain after,
// mobility after — decisions §6, never nagging, never blocking), a word for
// the practitioner — and it says plainly that nothing can change afterwards.
export function FinishSessionPage() {
  const { sessionId: param } = useParams<{ sessionId: string }>()
  const sessionId = Number(param)
  if (!Number.isInteger(sessionId) || sessionId < 1) {
    return (
      <Page>
        <NotAvailable what="session" />
      </Page>
    )
  }
  return <FinishView sessionId={sessionId} />
}

function FinishView({ sessionId }: { sessionId: number }) {
  const [today] = useState(() => localDateString())
  const session = useSession(sessionId)
  const program = useAssignedProgram(session.data?.assignedProgramId ?? 0, {
    enabled: session.isSuccess,
  })

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

  const sessionPath = `/patient/sessions/${sessionId}`
  // Finished already (a second tab, an old link): nothing to finish.
  if (session.data.status !== 'in_progress') {
    return (
      <Page>
        <p>This session is already finished.</p>
        <Link to={sessionPath} className="text-sm underline underline-offset-4">
          See the session
        </Link>
      </Page>
    )
  }
  // Open, but from an earlier day: completing happens on a session's own
  // day (the backend would answer 409). Stopping is what's left.
  if (session.data.localDate !== today) {
    return (
      <Page>
        <p>
          This session was started on another day, so it can no longer be finished. You can stop
          it instead: it will be kept as not finished.
        </p>
        <Link to={`${sessionPath}/stop`} className="text-sm underline underline-offset-4">
          Stop the session
        </Link>
      </Page>
    )
  }

  const names = program.data ? workoutNames(program.data.workouts) : null
  const subtitle = program.data
    ? `${program.data.title}${names?.several ? `: ${names.labelOf(session.data.workoutId)}` : ''}`
    : null
  return <FinishForm session={session.data} subtitle={subtitle} />
}

function FinishForm({ session, subtitle }: { session: Session; subtitle: string | null }) {
  const navigate = useNavigate()
  const [painAfter, setPainAfter] = useState<number | null>(null)
  const [mobilityAfter, setMobilityAfter] = useState<number | null>(null)
  const [feedback, setFeedback] = useState('')
  // After finishing: home, with a confirmation, REPLACING this page — Back
  // must not return to a form for a session that is now final.
  const finish = useSessionWrite(
    (body: ReturnType<typeof completeBody>) => completeSession(session.id, body),
    () => void navigate('/patient', { replace: true, state: { notice: ENDING_NOTICE.completed } }),
  )
  const unticked = untickedText(session.exercises)
  const sessionPath = `/patient/sessions/${session.id}`

  return (
    <Page>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Finish your session</h1>
        {subtitle && <p className="font-medium">{subtitle}</p>}
        <p className="text-sm text-muted-foreground">{checklistProgressText(session.exercises)}</p>
      </div>

      {unticked && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
          {unticked}{' '}
          <Link to={`${sessionPath}/stop`} className="underline underline-offset-4">
            Stop instead
          </Link>
        </p>
      )}

      {/* The check-out: two questions (decisions §6) — mobility AFTER only. */}
      <ScoreScale
        legend="How much pain do you have now?"
        lowLabel="no pain"
        highLabel="worst pain imaginable"
        value={painAfter}
        onChange={setPainAfter}
        disabled={finish.isPending}
      />
      <ScoreScale
        legend="How freely can you move now?"
        lowLabel="not at all"
        highLabel="completely freely"
        value={mobilityAfter}
        onChange={setMobilityAfter}
        disabled={finish.isPending}
      />

      <div className="space-y-2">
        <Label htmlFor="session-feedback">Anything to tell your practitioner about this session? (optional)</Label>
        <Textarea
          id="session-feedback"
          value={feedback}
          maxLength={FEEDBACK_MAX_LENGTH}
          onChange={(event) => setFeedback(event.target.value)}
          rows={3}
          disabled={finish.isPending}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        Once finished, the session is recorded as it is and can no longer be changed.
      </p>

      {finish.isError && (
        <p role="alert" className="text-sm text-destructive">
          {describeFailure("Couldn't finish the session", finish.error)}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          disabled={finish.isPending}
          onClick={() => finish.mutate(completeBody({ painAfter, mobilityAfter }, feedback))}
        >
          {finish.isPending ? 'Finishing…' : 'Finish session'}
        </Button>
        <Link to={sessionPath} className="text-sm underline underline-offset-4">
          Back to the session
        </Link>
      </div>
    </Page>
  )
}