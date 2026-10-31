import { expect, test, type Page } from '@playwright/test'
import { stateFile } from './support/accounts.ts'
import { apiAs } from './support/api.ts'
import { isoWeekday, todayInParis } from './support/dates.ts'

// The session timer (decisions §35): a patient on a phone times a held
// exercise set by set. What only a real browser can show — the jsdom tests
// fake the clock, the audio and the screen — is checked here:
//   - the clock the patient READS, driven by the app's real ticks and
//     `performance.now()`;
//   - real Web Audio: the beeps are made by Chromium's own AudioContext,
//     unlocked by a real click;
//   - the player around it: Done stays the patient's tap.
// Not checked here: the screen wake lock — Chromium's headless shell refuses
// it (decisions §35, "Verified"; the hooks' own tests cover it).
//
// The patient is Jo, not Pat: the patient test finishes Pat's session today,
// and a second session on one day is refused (one session a day).
test.use({ storageState: stateFile('jo'), viewport: { width: 375, height: 740 } })

const PROGRAM_TITLE = 'E2E Timed Holds'
// One of Alex's own exercises (the seed's custom ones — the suite's database
// has no exercise library, so the seed's library-based templates, Jo's
// Lower Back Mobility among them, are never made there).
const EXERCISE = 'Terminal Knee Extension (band)'

// A paged list's answer (`GET /exercises`): the rows are in `data`.
interface ListAnswer<T> {
  data: T[]
}

// THE PREPARATION, through the API ("API-seeded test data"): Alex — on Jo's
// care team — builds a one-exercise template prescribing a HOLD of 3 sets of
// 20 seconds, and assigns it to Jo, scheduled for TODAY's weekday from today:
// the same requests the template page and the assign form send (each has its
// own test). The database is seeded fresh every run, so nothing lingers.
test.beforeEach(async () => {
  const alex = await apiAs('alex')
  const jo = await apiAs('jo')
  const { id: patientId } = await jo.get<{ id: number }>('/auth/me')
  const found = await alex.get<ListAnswer<{ id: number; name: string }>>(
    `/exercises?search=${encodeURIComponent(EXERCISE)}`,
  )
  const exercise = found.data.find((row) => row.name === EXERCISE)
  if (!exercise) throw new Error(`The seed's exercise '${EXERCISE}' is missing`)

  const template = await alex.post<{ id: number }>('/programs', { title: PROGRAM_TITLE })
  // No workoutId: the template's first (and only) workout.
  await alex.post(`/programs/${template.id}/exercises`, {
    exerciseId: exercise.id,
    sortOrder: 0,
    sets: 3,
    durationInSeconds: 20,
  })
  const today = todayInParis()
  await alex.post('/assigned-programs', {
    patientId,
    basedOnTemplateId: template.id,
    title: PROGRAM_TITLE,
    startDate: today,
    schedule: { type: 'weekdays', days: [{ weekday: isoWeekday(today), workoutIndex: 0 }] },
  })
  await alex.dispose()
  await jo.dispose()
})

test('a held exercise counts down set by set, beeps, and leaves Done to the patient', async ({
  page,
}) => {
  // Counts the tones the page asks Chromium to play: every beep is one
  // OscillatorNode (src/sessions/timer/beeper.ts). Installed before any page
  // script runs, it wraps the browser's own method and calls it — the sound
  // is still made for real.
  await page.addInitScript(() => {
    const counted = window as Window & { tones?: number }
    counted.tones = 0
    // The method lives on BaseAudioContext (AudioContext inherits it). Read
    // from its property descriptor — a plain function value — rather than
    // detached as `prototype.createOscillator`, whose `this` the linter
    // can't vouch for.
    const original = Object.getOwnPropertyDescriptor(BaseAudioContext.prototype, 'createOscillator')
      ?.value as (this: BaseAudioContext) => OscillatorNode
    BaseAudioContext.prototype.createOscillator = function (this: BaseAudioContext) {
      counted.tones = (counted.tones ?? 0) + 1
      return original.call(this)
    }
  })

  // Playwright's fake clock, installed before the app loads: Date, the timers
  // and performance.now() inside the page are Playwright's. Time still flows
  // on its own until it's paused below.
  await page.clock.install()

  // Start today's session (no pain check-in — it's optional).
  await page.goto('/patient')
  await page
    .getByRole('region', { name: 'Today' })
    .getByRole('link', { name: `Start ${PROGRAM_TITLE}` })
    .click()
  await expect(page.getByRole('heading', { level: 1, name: 'Start your session' })).toBeVisible()
  await page.getByRole('button', { name: 'Start session' }).click()
  // The only exercise, so the player opens on it.
  await expect(page.getByText('Exercise 1 of 1')).toBeVisible()
  const held = page.getByRole('article', { name: EXERCISE })
  const clock = held.getByRole('timer', { name: 'Hold timer' })
  await expect(held.getByText('Hold for 20 seconds · set 1 of 3')).toBeVisible()
  await expect(clock).toContainText('0:20')

  // From here, time moves ONLY when the test says: paused one second ahead,
  // then advanced with runFor(), which fires every timer due on the way
  // (the app's 250 ms ticks). The values read are exact, on any machine.
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1_000)

  // Set 1: 6.5 seconds in, 13.5 left — a countdown rounds UP.
  await held.getByRole('button', { name: 'Start', exact: true }).click()
  await page.clock.runFor(6_500)
  await expect(clock).toContainText('0:14')

  // A pause holds the clock, however long it lasts.
  await held.getByRole('button', { name: 'Pause' }).click()
  await page.clock.runFor(60_000)
  await expect(clock).toContainText('0:14')

  // Resumed, the rest of the hold: the next set waits for the patient, said
  // on screen and to a screen reader, with two beeps.
  await held.getByRole('button', { name: 'Resume' }).click()
  await page.clock.runFor(14_000)
  await expect(held.getByRole('button', { name: 'Start set 2' })).toBeVisible()
  await expect(held.getByRole('status')).toHaveText("Set 1 done. Start set 2 when you're ready.")
  await expect.poll(() => tones(page)).toBe(2)
  // No rest timer: between sets nothing counts.
  await page.clock.runFor(30_000)
  await expect(clock).toContainText('0:20')

  // Sets 2 and 3: two more beeps, then three after the last.
  await held.getByRole('button', { name: 'Start set 2' }).click()
  await page.clock.runFor(20_000)
  await held.getByRole('button', { name: 'Start set 3' }).click()
  await page.clock.runFor(20_000)
  await expect(held.getByText('All 3 sets held', { exact: true })).toBeVisible()
  await expect(held.getByRole('button', { name: 'Start over' })).toBeVisible()
  await expect.poll(() => tones(page)).toBe(7)

  // Done is the patient's own tap: the timer never ticks it.
  await expect(held.getByRole('button', { name: `Done: ${EXERCISE}` })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
})

async function tones(page: Page): Promise<number> {
  return page.evaluate(() => (window as Window & { tones?: number }).tones ?? 0)
}
