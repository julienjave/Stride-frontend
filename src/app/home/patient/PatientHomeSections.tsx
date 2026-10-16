import type { UseQueryResult } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { totalsText } from '@/assigned-programs/progressText'
import { workoutNames } from '@/assigned-programs/programSchedule'
import type { AssignedProgramListItem, ScheduleSummary } from '@/assigned-programs/types'
import { leftOpenText } from '@/sessions/sessionText'
import { sessionLeftOpen, startChoice } from '@/sessions/startRules'
import { todayStatus } from '@/sessions/todayStatus'
import { progressFraction, upcomingItems, type ProgramWithSummary } from './patientHomeRules'
import { longDate, todayText, upcomingText, type TodayText } from './patientHomeText'

// The patient home's three sections (decisions §2): Today and Upcoming in
// one card, then "My programs". They only DRAW: what each program asks is
// decided by patientHomeRules, worded by patientHomeText.

// One program and its summary's query, in the same order (usePatientHome).
export interface HomeEntry {
  program: AssignedProgramListItem
  summary: UseQueryResult<ScheduleSummary>
}

// "B · Strength" when the program has several workouts, null with one.
function labelFor(program: AssignedProgramListItem, workoutId: number): string | null {
  const names = workoutNames(program.workouts)
  return names.several ? names.labelOf(workoutId) : null
}

// --- TODAY AND UPCOMING ------------------------------------------------------------

// One card, stacked: on a phone (the patient's main device, decisions §1)
// two side-by-side columns would squeeze each line to a few words, so
// Upcoming goes under Today at every width — the practitioner's card puts
// its short slots in columns; this card's content is lines of text.
export function TodayAndUpcomingCard({ entries, today }: { entries: HomeEntry[]; today: string }) {
  return (
    <Card>
      <CardContent className="space-y-6">
        <TodaySection entries={entries} today={today} />
        <UpcomingSection entries={entries} today={today} />
      </CardContent>
    </Card>
  )
}

// A Today row's button — the session flow's way in (Phase 4, 2026-10-16):
// "Start" leads to the start page (which asks the pain question and only
// then writes anything); "Resume" back into today's open session; "Skip
// today" (pass (c)) to the skip page — on a DUE row only, the one case the
// backend accepts (a scheduled day of a specific-days schedule).
interface TodayAction {
  verb: 'Start' | 'Resume' | 'Skip today'
  to: string
}

interface TodayRow {
  program: AssignedProgramListItem
  text: TodayText
  // A line of its own under the row's words: a session left open on an
  // earlier day. Apart from `text.detail` — joined to it, it ran into the
  // detail's last words ("Stopped earlier today (pain) Your session of…",
  // found in the live check).
  note: string | null
  action: TodayAction | null
  // Beside the main action, quieter: "Skip today" on a due row.
  secondary: TodayAction | null
}

// What a loaded program's row says and offers — or null: no row.
function todayRow(program: AssignedProgramListItem, summary: ScheduleSummary, today: string): TodayRow | null {
  const status = todayStatus(summary, today)
  // An open session from an EARLIER day (decided 2026-10-16): no Resume —
  // it can't be finished any more, and the next Start closes it — just one
  // sentence, so the patient isn't surprised to see it "not finished".
  const leftOpen = sessionLeftOpen(summary, today)
  const leftOpenLine = leftOpen ? leftOpenText(leftOpen.localDate) : null
  if (status === null) {
    // Nothing asked today: a row only to say the leftover.
    return leftOpenLine
      ? { program, text: { line: leftOpenLine, detail: null }, note: null, action: null, secondary: null }
      : null
  }

  const label = 'workoutId' in status ? labelFor(program, status.workoutId) : null
  const text = todayText(status, label)
  const choice = startChoice(summary, today)
  const action: TodayAction | null =
    choice.kind === 'start'
      ? { verb: 'Start', to: `/patient/sessions/start/${program.id}` }
      : choice.kind === 'resume'
        ? { verb: 'Resume', to: `/patient/sessions/${choice.sessionId}` }
        : null
  const secondary: TodayAction | null =
    status.kind === 'due' ? { verb: 'Skip today', to: `/patient/sessions/skip/${program.id}` } : null
  return { program, text, note: leftOpenLine, action, secondary }
}

function TodaySection({ entries, today }: { entries: HomeEntry[]; today: string }) {
  // One row per program that has something to say today — loading, failed,
  // or a status. A program with nothing today gets no row: three programs
  // each saying "Nothing today" would bury the one that has something.
  const rows: TodayRow[] = entries.flatMap(({ program, summary }) => {
    if (summary.isPending) {
      return [{ program, text: { line: 'Loading…', detail: null }, note: null, action: null, secondary: null }]
    }
    if (summary.isError) {
      return [
        {
          program,
          text: { line: "Couldn't load today's plan. Try refreshing.", detail: null },
          note: null,
          action: null,
          secondary: null,
        },
      ]
    }
    const row = todayRow(program, summary.data, today)
    return row ? [row] : []
  })

  return (
    <section aria-labelledby="home-today" className="space-y-3">
      <div>
        <h2 id="home-today" className="text-sm font-semibold uppercase text-muted-foreground">
          Today
        </h2>
        <p className="font-medium">{longDate(today)}</p>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing to do today.</p>
      ) : (
        // A list: a screen reader says how many items, and each program is
        // one stop. The button sits beside the words from `sm` up, under
        // them on a phone (a narrow column of text beside a button reads
        // badly at 375 px).
        <ul className="space-y-4">
          {rows.map(({ program, text, note, action, secondary }) => (
            <li
              key={program.id}
              className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="space-y-0.5">
                <p className="text-sm text-muted-foreground">{program.title}</p>
                <p className="font-medium">{text.line}</p>
                {text.detail && <p className="text-sm text-muted-foreground">{text.detail}</p>}
                {note && <p className="text-sm text-muted-foreground">{note}</p>}
              </div>
              {action && (
                <div className="flex shrink-0 flex-wrap gap-2 self-start">
                  <Button asChild>
                    {/* Named with the program: with several programs, a list
                        of plain "Start" links can't be told apart. The
                        visible word starts the name (voice control). */}
                    <Link to={action.to} aria-label={`${action.verb} ${program.title}`}>
                      {action.verb}
                    </Link>
                  </Button>
                  {secondary && (
                    <Button asChild variant="outline">
                      <Link to={secondary.to} aria-label={`${secondary.verb}: ${program.title}`}>
                        {secondary.verb}
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function UpcomingSection({ entries, today }: { entries: HomeEntry[]; today: string }) {
  // Built from every summary at once (the soonest days ACROSS programs), so
  // it waits for all of them — a list that reshuffles as each answer
  // arrives would be worse than a moment's "Loading…". A program whose
  // summary failed is left out; Today already says it failed.
  const loading = entries.some(({ summary }) => summary.isPending)
  const loaded: ProgramWithSummary[] = entries.flatMap(({ program, summary }) =>
    summary.data ? [{ program, summary: summary.data }] : [],
  )
  const byId = new Map(entries.map(({ program }) => [program.id, program]))
  const items = loading ? [] : upcomingItems(loaded, today)

  return (
    <section aria-labelledby="home-upcoming" className="space-y-3">
      <h2 id="home-upcoming" className="text-sm font-semibold uppercase text-muted-foreground">
        Upcoming
      </h2>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing planned in the next two weeks.</p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {items.map((item) => {
            // Every item names a program of `entries` (upcomingItems only
            // returns theirs), so the lookup always finds it.
            const program = byId.get(item.programId)!
            const label = item.kind === 'day' ? labelFor(program, item.workoutId) : null
            const { when, what, workout } = upcomingText(item, program.title, label)
            return (
              // A program has at most one line per date, and at most one
              // weekly line: kind + program + date is unique.
              <li
                key={`${item.kind}-${item.programId}-${'date' in item ? item.date : ''}`}
                className="flex gap-3"
              >
                {/* A fixed width, so every WHAT starts at the same place;
                    shrink-0 so a long WHAT wraps instead of squeezing it. */}
                <span className="w-24 shrink-0 font-medium">{when}</span>
                <span className="min-w-0">
                  {what}
                  {/* whitespace-nowrap: the label wraps as a whole, never
                      between "A ·" and "Mobility". */}
                  {workout !== null && (
                    <>
                      : <span className="whitespace-nowrap">{workout}</span>
                    </>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

// --- MY PROGRAMS --------------------------------------------------------------------

// One card per active program, listed equally: its title, who assigned it,
// and how it's going — "4 of 12 sessions done" with a bar when it has an end
// date, "5 sessions done" when it's open-ended (no total, so no bar —
// decisions §5). Not links yet: a patient's program page doesn't exist; the
// Sessions hub will be where they lead.
export function MyProgramsSection({ entries }: { entries: HomeEntry[] }) {
  return (
    <section aria-labelledby="home-programs" className="space-y-3">
      <h2 id="home-programs" className="text-lg font-semibold">
        My programs
      </h2>
      <ul className="space-y-3">
        {entries.map(({ program, summary }) => (
          <li key={program.id} className="space-y-2 rounded-lg border p-4">
            <div>
              <h3 className="font-medium">{program.title}</h3>
              {program.assigner && (
                <p className="text-sm text-muted-foreground">
                  From {program.assigner.firstName} {program.assigner.lastName}
                </p>
              )}
            </div>
            {summary.isPending && <p className="text-sm text-muted-foreground">Loading…</p>}
            {summary.isError && (
              <p className="text-sm text-destructive">Couldn't load the progress. Try refreshing.</p>
            )}
            {summary.data && <ProgramProgress title={program.title} summary={summary.data} />}
          </li>
        ))}
      </ul>
    </section>
  )
}

function ProgramProgress({ title, summary }: { title: string; summary: ScheduleSummary }) {
  const { headline } = totalsText(summary.totals)
  const fraction = progressFraction(summary.totals)
  return (
    <div className="space-y-1">
      <p className="text-sm">{headline}</p>
      {fraction && (
        // role="progressbar" with its values: a screen reader announces
        // "Knee Rehab progress, 33%" — the bar's look alone says nothing
        // to it. The headline above says the same in words, so the bar
        // only repeats it (never colour or length alone).
        <div
          role="progressbar"
          aria-label={`${title} progress`}
          aria-valuemin={0}
          aria-valuemax={fraction.expected}
          aria-valuenow={fraction.fulfilled}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary"
            // A width computed from data can't be a Tailwind class (classes
            // must be written out in full in the source), so it's a style.
            // Capped at 100%: extra sessions never push the bar past full.
            style={{ width: `${Math.min(100, (fraction.fulfilled / fraction.expected) * 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}