import { Link } from 'react-router'
import { formatCalendarDate } from '@/common/formatCalendarDate'
import { MY_RECORDS_PATH } from '@/medical-files/medicalFilePaths'
import { HOME_TREND_LINES, changeSinceFirst, degreeScale, indexCatalogue, latestVisitLines, type TrendLine } from './romRules'
import { changeText, degreesText, moreLinesText, trendLineLabel } from './romText'
import { useMovementCatalogue, useMyRangeOfMotion } from './useRangeOfMotion'

// The PATIENT HOME's range of motion (2026-11-01, the person's choices: the
// latest visit's movements, after My programs). A glance, like the programs'
// pain trend (progress/PainTrend.tsx): each value of the last visit — its
// side, the value, the change since it was first measured, a sparkline of
// its last few — then "See all your measurements", My records' section,
// which has the charts, the typical values and every assessment.
//
// Quiet by design, as the pain trend: nothing while it loads, nothing on an
// error (My records says it, where the measurements are the point), and
// nothing at all for a patient never measured — the home doesn't announce an
// empty record.
//
// Its reads are the patient's OWN, which the audit log doesn't record (the
// backend's isOthersRead, decided with this item) — opening the home every
// day leaves no trail. The same request and cache entry as My records.
const SPARK_POINTS = 8
const WIDTH = 72
const HEIGHT = 24
const PAD = 3

// The sparkline's colour per side: the chart's (`--rom-left` / `--rom-right`),
// the text colour for a movement with no side. Classes written out in full
// (Tailwind reads the source).
const SPARK_STYLE = {
  left: { stroke: 'stroke-rom-left', fill: 'fill-rom-left' },
  right: { stroke: 'stroke-rom-right', fill: 'fill-rom-right' },
  none: { stroke: 'stroke-foreground', fill: 'fill-foreground' },
} as const

export function RangeOfMotionTrend() {
  const record = useMyRangeOfMotion()
  const catalogue = useMovementCatalogue()
  if (!record.data || !catalogue.data) return null
  const visit = latestVisitLines(record.data, indexCatalogue(catalogue.data))
  if (visit === null || visit.lines.length === 0) return null
  const shown = visit.lines.slice(0, HOME_TREND_LINES)
  const more = visit.lines.length - shown.length

  return (
    <section aria-labelledby="home-range-of-motion" className="space-y-3">
      <h2 id="home-range-of-motion" className="text-lg font-semibold">
        Range of motion
      </h2>
      <div className="space-y-3 rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">
          Your last measurements, {formatCalendarDate(visit.measuredOn)}
        </p>
        <ul className="space-y-3">
          {shown.map((line) => (
            <TrendRow key={line.key} line={line} />
          ))}
        </ul>
        {more > 0 && <p className="text-sm text-muted-foreground">{moreLinesText(more)}</p>}
        <Link to={MY_RECORDS_PATH} className="inline-block text-sm font-medium underline underline-offset-4">
          See all your measurements
        </Link>
      </div>
    </section>
  )
}

function TrendRow({ line }: { line: TrendLine }) {
  const { card, series } = line
  const last = series.points[series.points.length - 1]
  const change = changeSinceFirst(series)
  const words = change && changeText(change.degrees, change.since)
  return (
    <li className="flex items-center justify-between gap-3 text-sm">
      <div className="min-w-0">
        <p className="font-medium">{trendLineLabel(card.movement.name, series.side, card.mode)}</p>
        <p>
          <span className="font-semibold tabular-nums">{degreesText(last.degrees)}</span>
          {words && (
            <span className="text-muted-foreground">
              {' · '}
              <span aria-hidden="true">{words.shown}</span>
              <span className="sr-only">{words.spoken}</span>
            </span>
          )}
        </p>
      </div>
      <Sparkline line={line} />
    </li>
  )
}

// The last few values of the side, evenly spaced by ORDER (the glance; My
// records has the dated chart), on the card's own scale — the values and the
// typical value, so a few degrees don't look like a collapse. Decoration for
// the eye: the words beside it say what it shows. Nothing for one value.
function Sparkline({ line }: { line: TrendLine }) {
  const points = line.series.points.slice(-SPARK_POINTS)
  if (points.length < 2) return null
  const { low, high } = degreeScale(line.card)
  const style = SPARK_STYLE[line.series.side ?? 'none']
  const step = (WIDTH - 2 * PAD) / (SPARK_POINTS - 1)
  const offset = (SPARK_POINTS - points.length) * step
  const xOf = (index: number) => PAD + offset + index * step
  const yOf = (degrees: number) => PAD + (1 - (degrees - low) / (high - low)) * (HEIGHT - 2 * PAD)
  const lastIndex = points.length - 1
  return (
    <svg aria-hidden="true" width={WIDTH} height={HEIGHT} className="shrink-0" data-sparkline="">
      <polyline
        points={points.map((p, i) => `${xOf(i)},${yOf(p.degrees)}`).join(' ')}
        fill="none"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        className={style.stroke}
      />
      <circle data-last="" cx={xOf(lastIndex)} cy={yOf(points[lastIndex].degrees)} r={3} className={style.fill} />
    </svg>
  )
}