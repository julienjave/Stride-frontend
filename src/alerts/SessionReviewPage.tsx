import type { ReactNode } from 'react'
import { useParams, Link } from 'react-router'
import { failureText } from '@/api/apiErrors'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { workoutNames } from '@/assigned-programs/programSchedule'
import { useAssignedProgram } from '@/assigned-programs/useAssignedProgram'
import { formatShortDate } from '@/common/calendarDate'
import { LoadFailure } from '@/common/LoadError'
import { NotAvailable } from '@/common/NotAvailable'
import { PrescriptionSummary } from '@/common/PrescriptionSummary'
import { useRetryFocus } from '@/common/useRetryFocus'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { wasAsked, type ScoreKey } from '@/progress/scoreRules'
import { countsForText, sessionStatusText } from '@/sessions/sessionText'
import { useUser } from '@/users/useUser'
import { endNoteLabel, reviewLine, scoreText } from './sessionReviewText'
import type { StaffSession } from './types'
import { useReviewSession } from './useReviewSession'
import { useStaffSession } from './useStaffSession'
import { Loading } from '@/common/Loading'

// One session as the care team reads it — `/practitioner/sessions/:id`
// (2026-10-19, decisions §3, "The practitioner's For review list"). Before it, a
// practitioner could see a session's pain scores on the program page's
// charts, but no difficulty rating and none of the patient's notes.
//
// READ-ONLY: a session is the patient's own report (decisions §5 — the
// practitioner never writes it). The one action is about the READER:
// "Mark as reviewed" records that I looked (POST /sessions/:id/review), and
// takes it off MY "For review" list — a colleague's list keeps it until they look too.
//
// Who may open it is the backend's rule: the care team and admins read a
// session; anyone else gets 404 (row security hides it). The route is
// practitioner-only (routes.tsx), so the page never meets an admin.
export function SessionReviewPage() {
  const { sessionId: param } = useParams<{ sessionId: string }>()
  const sessionId = Number(param)
  // A non-number in the address can't be a session: say so without asking
  // the server (the same answer as a session that doesn't exist).
  if (!Number.isInteger(sessionId) || sessionId < 1) {
    return (
      <Page>
        <NotAvailableBody />
      </Page>
    )
  }
  return <ReviewView sessionId={sessionId} />
}

function ReviewView({ sessionId }: { sessionId: number }) {
  const session = useStaffSession(sessionId)
  // The program (title, workout names) and the patient (name) — dependent
  // queries: `enabled` waits until the session says which ones. Usually
  // cached already when the practitioner comes from the program page.
  const loaded = session.isSuccess
  const program = useAssignedProgram(session.data?.assignedProgramId ?? 0, { enabled: loaded })
  const patient = useUser(session.data?.patientId ?? 0, { enabled: loaded })
  const { data: me } = useCurrentUser()
  // After a "Try again" that worked, focus goes to the page's title.
  const heading = useRetryFocus<HTMLHeadingElement>('this session', loaded)

  if (session.isPending) {
    return (
      <Page>
        <Loading label="Loading the session…" />
      </Page>
    )
  }
  if (session.isError) {
    return (
      <Page>
        <LoadFailure queries={[session]} what="this session" notAvailable={<NotAvailableBody />}>
          <HomeLink />
        </LoadFailure>
      </Page>
    )
  }

  const data = session.data
  const names = program.data ? workoutNames(program.data.workouts) : null
  return (
    <Page>
      <header className="space-y-1">
        {/* The title waits for the program; the session shows meanwhile. */}
        <h1 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">
          {program.data?.title ?? 'Session'}
        </h1>
        {patient.data && (
          <p>
            <Link
              to={`/practitioner/patients/${data.patientId}`}
              className="underline underline-offset-4"
            >
              {patient.data.firstName} {patient.data.lastName}
            </Link>
          </p>
        )}
        {names?.several && <p className="font-medium">{names.labelOf(data.workoutId)}</p>}
        <p className="text-sm text-muted-foreground">
          {formatShortDate(data.localDate)} · {sessionStatusText(data)}
        </p>
        {countsForText(data) && (
          <p className="text-sm text-muted-foreground">{countsForText(data)}</p>
        )}
      </header>
      <HowItWent session={data} />
      <Exercises session={data} />
      {me && <Reviews session={data} myId={me.id} />}
      <nav aria-label="Leave this session" className="flex flex-wrap gap-x-4 gap-y-2">
        <Link
          to={`/practitioner/programs/assigned/${data.assignedProgramId}`}
          className="text-sm underline underline-offset-4"
        >
          View program
        </Link>
        <HomeLink />
      </nav>
    </Page>
  )
}

// The scores asked, and the patient's own words about the session. A
// score never ASKED (a skip has no check-out; a session the app closed was
// never checked out) isn't listed; one asked and left blank says "Not
// answered" — the same distinction as the charts (progress/scoreRules.ts).
const SCORES: { key: ScoreKey; label: string }[] = [
  { key: 'painBefore', label: 'Pain before' },
  { key: 'painAfter', label: 'Pain after' },
  { key: 'mobilityAfter', label: 'Mobility after' },
]

function HowItWent({ session }: { session: StaffSession }) {
  const scores = SCORES.filter(({ key }) => wasAsked(session, key))
  return (
    <section aria-labelledby="how-it-went" className="space-y-2">
      <h2 id="how-it-went" className="text-sm font-semibold uppercase text-muted-foreground">
        How it went
      </h2>
      {scores.length > 0 && (
        // A description list: each label (dt) with its value (dd) — read as
        // pairs by a screen reader, laid out in two columns.
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {scores.map(({ key, label }) => (
            <div key={key} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd>{scoreText(session[key])}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="text-xs text-muted-foreground">0 = no pain, 10 = worst pain · mobility: 10 = moved freely</p>
      {/* Written as one condition so TypeScript NARROWS the status: inside
          it, the status is known to be 'incomplete' or 'skipped' — exactly
          what endNoteLabel accepts, no cast needed. */}
      {(session.status === 'incomplete' || session.status === 'skipped') &&
        session.endNote !== null && (
          <Quote label={endNoteLabel(session.status)} text={session.endNote} />
        )}
      {session.sessionFeedback !== null && (
        <Quote label="Their feedback on the session" text={session.sessionFeedback} />
      )}
    </section>
  )
}

// The patient's words, set apart as a quotation (blockquote): a reader can
// tell at once what the patient wrote from what the app says.
function Quote({ label, text }: { label: string; text: string }) {
  return (
    <figure className="space-y-1 text-sm">
      <figcaption className="text-muted-foreground">{label}</figcaption>
      <blockquote className="whitespace-pre-line border-l-2 pl-3">{text}</blockquote>
    </figure>
  )
}

function Exercises({ session }: { session: StaffSession }) {
  return (
    <section aria-labelledby="review-exercises" className="space-y-2">
      <h2 id="review-exercises" className="text-sm font-semibold uppercase text-muted-foreground">
        Exercises
      </h2>
      {session.exercises.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {session.status === 'skipped'
            ? 'Skipped before starting: no exercise was done.'
            : 'No exercises in this session.'}
        </p>
      ) : (
        <ol className="divide-y rounded-lg border">
          {session.exercises.map((exercise) => (
            <li key={exercise.id} className="space-y-1 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="font-medium">{exercise.name}</p>
                  <PrescriptionSummary prescription={exercise} className="text-sm" />
                </div>
                {/* The state in WORDS — a colour alone says nothing to a
                    screen reader (the patient page's choice too). */}
                <span
                  className={cn(
                    'shrink-0 rounded-full border px-2 py-0.5 text-xs',
                    exercise.completed
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'text-muted-foreground',
                  )}
                >
                  {exercise.completed ? 'Done' : 'Not done'}
                </span>
              </div>
              {exercise.difficultyRating !== null && (
                <p className="text-sm">Difficulty: {exercise.difficultyRating} out of 10</p>
              )}
              {exercise.feedback !== null && <Quote label="Their note" text={exercise.feedback} />}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

// Who has looked at it, and the button for me. Every review is listed for
// the whole care team (decided 2026-10-19); mine says "You".
function Reviews({ session, myId }: { session: StaffSession; myId: number }) {
  const review = useReviewSession(session.id)
  const mine = session.reviews.some((r) => r.practitioner.id === myId)
  return (
    <section aria-labelledby="reviews" className="space-y-2">
      <h2 id="reviews" className="text-sm font-semibold uppercase text-muted-foreground">
        Reviewed by
      </h2>
      {session.reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nobody on the care team has marked it reviewed yet.
        </p>
      ) : (
        <ul className="space-y-1 text-sm">
          {session.reviews.map((r) => (
            <li key={r.practitioner.id}>{reviewLine(r, myId)}</li>
          ))}
        </ul>
      )}
      {session.status === 'in_progress' ? (
        <p className="text-sm text-muted-foreground">
          This session is still in progress: it can be reviewed once it has ended.
        </p>
      ) : (
        !mine && (
          <div className="space-y-1">
            <Button type="button" disabled={review.isPending} onClick={() => review.mutate()}>
              {review.isPending ? 'Saving…' : 'Mark as reviewed'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Takes it off your “For review” list. Your colleagues' lists aren't changed.
            </p>
            {review.isError && (
              <p role="alert" className="text-sm text-destructive">
                {failureText(review.error, "Couldn't save. Try again.")}
              </p>
            )}
          </div>
        )
      )}
    </section>
  )
}

function Page({ children }: { children: ReactNode }) {
  return <div className="mx-auto mt-8 max-w-2xl space-y-6 px-4 pb-8">{children}</div>
}

function HomeLink() {
  return (
    <Link to="/practitioner" className="text-sm underline underline-offset-4">
      Back to home
    </Link>
  )
}

// No such session, or one of a patient whose care team I'm not on — the
// backend answers both with 404 on purpose (row security), so the page
// can't tell them apart either, and says what is true of both — in the
// shared shape (common/NotAvailable, 2026-10-23), with the program pages'
// rule sentence. "Back to home": the practitioner's For review list, where
// these links come from.
function NotAvailableBody() {
  return (
    <NotAvailable
      title="Session not available"
      links={[
        { to: '/practitioner', label: 'Back to home' },
        { to: '/practitioner/patients', label: 'My patients' },
      ]}
    >
      This session doesn't exist, or it belongs to a patient whose care team you're not on. Only a
      patient's care team can open their sessions.
    </NotAvailable>
  )
}