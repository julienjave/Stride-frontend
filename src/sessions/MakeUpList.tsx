import { useId } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import type { AssignedProgramListItem, ScheduleSummary } from '@/assigned-programs/types'
import { makeUps } from './makeUpRules'
import { lastDayText, makeUpBlockText, makeUpName, makeUpTiming } from './makeUpText'
import { workoutLabel } from './todayRow'

// "To make up" — one program's missed sessions that can still be made up,
// EACH with its own button (decided 2026-10-16/17: the on-time catch-up and
// every late one side by side; the patient chooses). Nothing when there are
// none. On the Sessions hub's program cards now, the patient's program page
// in pass 2.
//
// Each button leads to the start page with the day it makes up
// (`?for=YYYY-MM-DD`) — which checks it again against a FRESH summary
// (startChoiceFor) before offering "Start session", so a list opened an hour
// ago can't start what is no longer allowed. Nothing is written by the tap.
export function MakeUpList({
  program,
  summary,
  today,
  headingLevel,
}: {
  program: Pick<AssignedProgramListItem, 'id' | 'title' | 'workouts'>
  summary: ScheduleSummary
  today: string
  // The list's heading sits one level below its container's: h4 inside a
  // hub card (whose title is an h3), h2 on a page of its own. A fixed level
  // would put "To make up" beside the program's title in a screen reader's
  // list of headings, instead of under it.
  headingLevel: 2 | 3 | 4
}) {
  // useId: a unique id per list — several cards on one page each have a
  // heading and a reason to point at.
  const id = useId()
  const { offers, blocked, lastDay } = makeUps(summary, today)
  if (offers.length === 0) return null
  const headingId = `${id}-heading`
  const reasonId = `${id}-reason`
  const hasLate = offers.some((offer) => offer.kind === 'late')
  const Heading = `h${headingLevel}` as const

  return (
    <section aria-labelledby={headingId} className="space-y-2">
      <Heading id={headingId} className="text-sm font-semibold uppercase text-muted-foreground">
        To make up
      </Heading>
      {blocked && (
        <p id={reasonId} className="text-sm text-muted-foreground">
          {makeUpBlockText(blocked, offers.length > 1)}
        </p>
      )}
      {/* The warning matters only when there's a late one to choose
          instead. */}
      {lastDay && hasLate && (
        <p className="text-sm">
          {lastDayText(lastDay, workoutLabel(program, lastDay.workoutId))}
        </p>
      )}
      <ul className="divide-y rounded-lg border">
        {offers.map((offer) => {
          const name = makeUpName(offer, workoutLabel(program, offer.workoutId))
          // Named with the session AND the program: several "Make it up"
          // buttons on one page, maybe in several cards, can't be told
          // apart by their word alone. The visible words start the name
          // (voice control: "click Make it up" finds them).
          const label = `Make it up: ${name} (${program.title})`
          return (
            // One offer per day: forDay is unique in the list (a day is
            // either still in its window or past it, never both).
            <li
              key={offer.forDay}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-0.5">
                <p className="font-medium">{name}</p>
                <p className="text-sm text-muted-foreground">{makeUpTiming(offer, today)}</p>
              </div>
              {blocked ? (
                // Disabled, and pointing at the sentence that says why — a
                // screen reader hears the reason with the button.
                <Button
                  variant="outline"
                  disabled
                  aria-label={label}
                  aria-describedby={reasonId}
                  className="self-start sm:self-auto"
                >
                  Make it up
                </Button>
              ) : (
                <Button asChild variant="outline" className="self-start sm:self-auto">
                  <Link
                    to={`/patient/sessions/start/${program.id}?for=${offer.forDay}`}
                    aria-label={label}
                  >
                    Make it up
                  </Link>
                </Button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}