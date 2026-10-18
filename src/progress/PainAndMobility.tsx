import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { AssignedProgramDetail } from '@/assigned-programs/types'
import { workoutLabel } from '@/sessions/todayRow'
import type { ProgramSession } from './api'
import { ScoreChart, SeriesKey } from './ScoreChart'
import { ScoresTable } from './ScoresTable'
import {
  askedSessions,
  chartRange,
  hasAnswer,
  inRange,
  oldestFirst,
  type ScoreKey,
} from './scoreRules'
import {
  SCALE_TEXT,
  SCORE_LABEL,
  mobilitySummaryText,
  noScoresText,
  noSessionsText,
  painSummaryText,
  type ScoreViewer,
} from './scoreText'
import { useProgramSessions } from './useProgramSessions'

// "Pain and mobility" — one program's scores over time (the progress page,
// agreed 2026-10-18; decisions §6). On BOTH program pages: the patient's
// (inside "Progress", between the totals and the weeks) and the care
// team's (a section of its own) — the same charts, only the empty
// sentences speak to the reader.
//   - Per program, always: a knee and a shoulder are pain in two places,
//     never averaged together (§6).
//   - Two charts, not one: pain BEFORE and AFTER as two lines (the gap
//     between them is each session's effect — an average would hide a
//     session that made things worse); MOBILITY apart, its scale running
//     the other way (10 = best).
//   - One choice above both charts and the table: the last 12 weeks, or
//     the whole program — every view of the data agrees (the dataviz rule:
//     a filter scopes everything below it).
const PAIN_KEYS: readonly ScoreKey[] = ['painBefore', 'painAfter']
const MOBILITY_KEYS: readonly ScoreKey[] = ['mobilityAfter']
const ALL_KEYS: readonly ScoreKey[] = [...PAIN_KEYS, ...MOBILITY_KEYS]

const HINT = 'Tap or point at the chart to read a session — or focus it and use the arrow keys.'

export function PainAndMobility({
  program,
  today,
  viewer,
  headingLevel,
}: {
  program: Pick<AssignedProgramDetail, 'id' | 'startDate' | 'endDate' | 'workouts'>
  today: string
  viewer: ScoreViewer
  // 3 inside the patient's "Progress" section, 2 as a section of its own.
  headingLevel: 2 | 3
}) {
  const sessions = useProgramSessions(program.id)
  const [showAll, setShowAll] = useState(false)
  const headingId = useId()
  const painSummaryId = useId()
  const mobilitySummaryId = useId()
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  const ChartHeading = headingLevel === 2 ? 'h3' : 'h4'

  function body() {
    if (sessions.isPending) {
      return <p className="text-sm text-muted-foreground">Loading pain and mobility…</p>
    }
    if (sessions.isError) {
      return (
        <p className="text-sm text-destructive">
          Couldn't load the pain and mobility scores. Try refreshing.
        </p>
      )
    }
    const all = oldestFirst(sessions.data)
    const span = chartRange(program, today, all, showAll)
    if (span === null || all.length === 0) {
      return <p className="text-sm text-muted-foreground">{noSessionsText(viewer)}</p>
    }
    const { range, canCut } = span
    const shown = inRange(all, range)
    const workoutOf = (workoutId: number) => workoutLabel(program, workoutId)
    // "None in the last 12 weeks" only when the program was CUT and its
    // whole span has some — otherwise the plain "none yet". (No `showAll`
    // test needed: showing all, the chart's sessions ARE the whole
    // program's, so an empty chart means none anywhere — a mutation check
    // found the extra condition changed nothing.)
    const cut = (keys: readonly ScoreKey[]) => canCut && hasAnswer(askedSessions(all, keys), keys)

    const pain = askedSessions(shown, PAIN_KEYS)
    const mobility = askedSessions(shown, MOBILITY_KEYS)

    return (
      <>
        {canCut && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-pressed={showAll}
            onClick={() => setShowAll((value) => !value)}
          >
            {showAll ? 'Show the last 12 weeks' : 'Show the whole program'}
          </Button>
        )}

        <div className="space-y-2">
          <ChartHeading className="text-sm font-semibold">Pain</ChartHeading>
          <p className="text-xs text-muted-foreground">{SCALE_TEXT.pain}</p>
          {hasAnswer(pain, PAIN_KEYS) ? (
            <>
              <p id={painSummaryId} className="text-sm">
                {painSummaryText(pain)}
              </p>
              <Legend hollow={drawsHollow(pain, PAIN_KEYS)} />
              <ScoreChart
                label="Pain chart"
                describedBy={painSummaryId}
                sessions={pain}
                keys={PAIN_KEYS}
                range={range}
                workoutOf={workoutOf}
                hint={HINT}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {noScoresText('pain', viewer, cut(PAIN_KEYS))}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <ChartHeading className="text-sm font-semibold">Mobility</ChartHeading>
          <p className="text-xs text-muted-foreground">{SCALE_TEXT.mobility}</p>
          {hasAnswer(mobility, MOBILITY_KEYS) ? (
            <>
              <p id={mobilitySummaryId} className="text-sm">
                {mobilitySummaryText(mobility)}
              </p>
              {/* One series: no legend (the heading names it) — but the
                  hollow dot still needs its explanation. */}
              {drawsHollow(mobility, MOBILITY_KEYS) && <Legend hollow series={false} />}
              <ScoreChart
                label="Mobility chart"
                describedBy={mobilitySummaryId}
                sessions={mobility}
                keys={MOBILITY_KEYS}
                range={range}
                workoutOf={workoutOf}
                hint={HINT}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {noScoresText('mobility', viewer, cut(MOBILITY_KEYS))}
            </p>
          )}
        </div>

        {hasAnswer(shown, ALL_KEYS) && (
          <ScoresTable sessions={askedSessions(shown, ALL_KEYS)} workoutOf={workoutOf} />
        )}
      </>
    )
  }

  return (
    <section aria-labelledby={headingId} className="space-y-4">
      <Heading
        id={headingId}
        className={headingLevel === 2 ? 'text-base font-semibold' : 'font-semibold'}
      >
        Pain and mobility
      </Heading>
      {body()}
    </section>
  )
}

// Whether the chart draws a hollow dot: a session not completed that
// ANSWERED one of its questions (one that didn't has no dot to explain).
function drawsHollow(sessions: readonly ProgramSession[], keys: readonly ScoreKey[]): boolean {
  return sessions.some((s) => s.status !== 'completed' && keys.some((key) => s[key] !== null))
}

// The pain chart's legend — always there for two series (colour is never
// the only way to tell them apart: the end labels and the readout name
// them too) — and the hollow dot's meaning, when one is drawn.
function Legend({ hollow, series = true }: { hollow: boolean; series?: boolean }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {series &&
        PAIN_KEYS.map((key) => (
          <li key={key} className="flex items-center gap-1.5">
            <SeriesKey scoreKey={key} />
            {SCORE_LABEL[key]} the session
          </li>
        ))}
      {hollow && (
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block size-2.5 rounded-full border-2 border-muted-foreground"
          />
          Session not completed
        </li>
      )}
    </ul>
  )
}