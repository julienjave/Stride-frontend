import { latestAnswered, lineRuns, oldestFirst } from './scoreRules'
import { painAfterTrend, sparkSessions, SPARK_SESSIONS } from './painTrendRules'
import { TREND_TEXT, latestPainAfterText } from './scoreText'
import { useProgramSessions } from './useProgramSessions'

// The HOME's pain trend, on each program's card (decisions §2; built with
// the progress page, 2026-10-18): the latest pain after a session, a
// sparkline of the last 8, and — with enough answers — the direction in
// words with an arrow. The program page has the whole story; this is the
// glance.
//
// The same request and cache entry as the program page's charts
// (useProgramSessions): opening the program from here asks nothing more.
//
// Quiet by design: nothing while it loads (a line appearing is less
// distracting than a "Loading…" in every card), nothing on an error (the
// program page says it, where the scores are the point), and nothing when no
// pain after has been recorded — the home never nudges anyone to answer
// (decisions §6: the scores are optional).
const WIDTH = 96
const HEIGHT = 24
const PAD = 3

export function PainTrend({ programId }: { programId: number }) {
  const sessions = useProgramSessions(programId)
  if (!sessions.data) return null
  const all = oldestFirst(sessions.data)
  const latest = latestAnswered(all, 'painAfter')
  if (latest === null) return null
  const trend = painAfterTrend(all)
  const spark = sparkSessions(all)

  // Positions by ORDER here, not by date: a glance at the last few, evenly
  // spaced (the program page has the dated chart). The scale stays 0–10 —
  // never stretched to the values' own range, which would make a 3 → 2
  // look like a collapse.
  const step = (WIDTH - 2 * PAD) / Math.max(SPARK_SESSIONS - 1, 1)
  const offset = (SPARK_SESSIONS - spark.length) * step
  const positions = new Map(spark.map((s, i) => [s.id, i]))
  const runs = lineRuns(spark, 'painAfter', positions)
  const xOf = (index: number) => PAD + offset + index * step
  const yOf = (value: number) => PAD + (1 - value / 10) * (HEIGHT - 2 * PAD)
  const last = runs.at(-1)?.at(-1)

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div className="min-w-0">
        <p>{latestPainAfterText(latest)}</p>
        {trend && (
          <p className="text-muted-foreground">
            <span aria-hidden="true">{TREND_TEXT[trend].arrow} </span>
            {TREND_TEXT[trend].words}
          </p>
        )}
      </div>
      {/* Decoration for the eye: the sentences above say what it shows. */}
      <svg aria-hidden="true" width={WIDTH} height={HEIGHT} className="shrink-0" data-sparkline="">
        {runs
          .filter((run) => run.length > 1)
          .map((run) => (
            <polyline
              key={run[0].session.id}
              data-run={run.map((p) => p.session.id).join(' ')}
              points={run.map((p) => `${xOf(p.x)},${yOf(p.value)}`).join(' ')}
              fill="none"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              className="stroke-score-pain-after"
            />
          ))}
        {/* An answer between two blanks has no line to sit on: a small dot. */}
        {runs
          .filter((run) => run.length === 1 && run[0] !== last)
          .map(([point]) => (
            <circle
              key={point.session.id}
              data-session={point.session.id}
              cx={xOf(point.x)}
              cy={yOf(point.value)}
              r={1.5}
              className="fill-score-pain-after"
            />
          ))}
        {last && (
          <circle
            data-session={last.session.id}
            data-last=""
            cx={xOf(last.x)}
            cy={yOf(last.value)}
            r={3}
            className="fill-score-pain-after"
          />
        )}
      </svg>
    </div>
  )
}