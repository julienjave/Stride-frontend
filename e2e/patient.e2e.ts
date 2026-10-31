import { expect, test } from '@playwright/test'
import { stateFile } from './support/accounts.ts'
import { apiAs } from './support/api.ts'
import { isoWeekday, todayInParis } from './support/dates.ts'

// Phase 4's demo target (roadmap): "patient sees today's session on their
// home page, completes it end-to-end on a phone, and watches their progress
// and pain trend update".
test.use({ storageState: stateFile('pat'), viewport: { width: 375, height: 740 } })

interface ProgramListItem {
  id: number
  title: string
  workouts: { id: number; name: string | null }[]
}

// THE PREPARATION, through the API (the roadmap's "API-seeded test data"):
// the seed is relative to the day it runs, and Pat's program is Monday,
// Wednesday, Friday — on any other day nothing is due, and this test would
// pass or fail by the calendar. So Alex, Pat's practitioner, schedules
// workout A for TODAY's weekday from today on — one request, the same one
// the program page's "Change schedule" sends (its screens have their own
// tests). The suite reseeds on every run, so the change never lingers.
test.beforeEach(async () => {
  const pat = await apiAs('pat')
  const alex = await apiAs('alex')
  const programs = await pat.get<ProgramListItem[]>('/assigned-programs')
  const knee = programs.find((program) => program.title === 'Knee Rehab — Pat')
  if (!knee) throw new Error("The seed's program 'Knee Rehab — Pat' is missing")
  const today = todayInParis()
  await alex.post(`/assigned-programs/${knee.id}/schedules`, {
    effectiveFrom: today,
    type: 'weekdays',
    days: [{ weekday: isoWeekday(today), workoutId: knee.workouts[0].id }],
  })
  await pat.dispose()
  await alex.dispose()
})

test("a patient does today's session on a phone and sees it counted", async ({ page }) => {
  await page.goto('/patient')
  const today = page.getByRole('region', { name: 'Today' })
  await expect(today.getByText('Knee Rehab — Pat')).toBeVisible()

  // How many sessions the program showed BEFORE — read, not assumed: the
  // seed's history decides it, and the test only cares that it grows by one.
  const programs = page.getByRole('region', { name: 'My programs' })
  const doneBefore = await sessionsDone(programs.getByText(/\d+ sessions? done/))

  // Start, with the optional pain check-in. The scales repeat the same
  // radio names ("0" … "10"), so each is picked inside its own group.
  await today.getByRole('link', { name: 'Start Knee Rehab — Pat' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Start your session' })).toBeVisible()
  await page
    .getByRole('group', { name: 'How much pain do you have right now?' })
    .getByRole('radio', { name: '4', exact: true })
    // force: the native radio is hidden inside its styled label (ScoreScale)
    // — a person clicks the label; check() on a hidden input needs force.
    .check({ force: true })
  await page.getByRole('button', { name: 'Start session' }).click()

  // The session: every exercise ticked Done (the list says how many).
  await expect(page.getByText('In progress', { exact: false })).toBeVisible()
  await expect(page.getByText('Pain when you started: 4 out of 10')).toBeVisible()
  const allExercises = page.getByRole('region', { name: 'All exercises' }).getByRole('listitem')
  const count = await allExercises.count()
  for (let index = 0; index < count; index++) {
    await allExercises.nth(index).getByRole('button').click()
    await page.getByRole('button', { name: /^Done: / }).click()
    await expect(page.getByRole('button', { name: /^Done: / })).toHaveAttribute('aria-pressed', 'true')
  }
  await expect(page.getByText(`${count} of ${count} exercise${count === 1 ? '' : 's'} done`)).toBeVisible()

  // Finish, with the check-out.
  await page.getByRole('link', { name: 'Finish session' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Finish your session' })).toBeVisible()
  await page
    .getByRole('group', { name: 'How much pain do you have now?' })
    .getByRole('radio', { name: '2', exact: true })
    .check({ force: true })
  await page.getByRole('button', { name: 'Finish session' }).click()

  // Home again: the snackbar, and today says it's done.
  await expect(page.getByRole('heading', { level: 1, name: /Hello Pat/ })).toBeVisible()
  await expect(
    page.getByRole('region', { name: /^Notifications/ }).getByText('Session finished. Well done!'),
  ).toBeVisible()
  await expect(today.getByText('Done for today')).toBeVisible()
  // Counted: one more session done, and the pain trend reads today's answer.
  await expect(programs.getByText(`${doneBefore + 1} sessions done`)).toBeVisible()
  await expect(programs.getByText(/Pain after sessions: 2 \(/)).toBeVisible()

  // The program page's progress section draws today's scores too.
  await programs.getByRole('link', { name: 'View program: Knee Rehab — Pat' }).click()
  await expect(page.getByRole('region', { name: 'Pain and mobility' })).toBeVisible()
})

async function sessionsDone(locator: import('@playwright/test').Locator): Promise<number> {
  const text = (await locator.first().textContent()) ?? ''
  const match = /(\d+) sessions? done/.exec(text)
  if (!match) throw new Error(`No "N sessions done" in: ${text}`)
  return Number(match[1])
}
