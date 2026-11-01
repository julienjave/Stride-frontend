import { expect, test } from '@playwright/test'
import { stateFile } from './support/accounts.ts'
import { apiAs } from './support/api.ts'
import { todayInParis } from './support/dates.ts'

// Practitioner-measured range of motion (decisions §36). What only a real
// browser shows — the jsdom tests draw the chart at a fixed 320 px and drive
// the form with simulated events — is checked here, end to end against the
// real API and database:
//   - the patient page's card leads to the record, whose movement card shows
//     the latest values, the change, and a chart Chromium actually lays out;
//   - the form records an assessment (the native selects, the boxes), and an
//     amendment of it — the request the backend accepts, the snackbar, the
//     record read again;
//   - the patient reads the same card in My records, the typical value as a
//     guide.
//
// THE PREPARATION, through the API ("API-seeded test data"): Alex — on Pat's
// care team — records Pat's SHOULDER ABDUCTION twice, two weeks and one week
// ago. Not the knee: the suite's database is seeded with Pat's knee (the dev
// seed), and a movement of its own keeps this test's values apart from it.
// The database is seeded fresh every run, so nothing lingers.

const CARD = 'Shoulder abduction · active'

function daysAgo(days: number): string {
  // Noon UTC of today in Paris, moved back: the same calendar arithmetic as
  // the app (src/common/calendarDate.ts), with no date library.
  const day = new Date(`${todayInParis()}T12:00:00Z`)
  day.setUTCDate(day.getUTCDate() - days)
  return day.toISOString().slice(0, 10)
}

let patId = 0

test.beforeAll(async () => {
  const alex = await apiAs('alex')
  const pat = await apiAs('pat')
  patId = (await pat.get<{ id: number }>('/auth/me')).id
  for (const [ago, left, right] of [
    [14, 170, 120],
    [7, 172, 135],
  ] as const) {
    await alex.post('/range-of-motion', {
      patientId: patId,
      measuredOn: daysAgo(ago),
      measurements: [
        { movement: 'shoulder_abduction', side: 'left', mode: 'active', degrees: left },
        { movement: 'shoulder_abduction', side: 'right', mode: 'active', degrees: right },
      ],
    })
  }
  await alex.dispose()
  await pat.dispose()
})

test.describe('the practitioner', () => {
  test.use({ storageState: stateFile('alex') })

  test('reads the record, records an assessment, then amends it', async ({ page }) => {
    // The way in: the patient page's data-free card.
    await page.goto(`/practitioner/patients/${patId}`)
    await page.getByRole('region', { name: 'Range of motion' }).getByRole('link', { name: 'Open range of motion' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Range of motion' })).toBeVisible()

    // The card: each side's latest value and its change since the first.
    const card = page.getByRole('article', { name: CARD })
    await expect(card.getByRole('definition').nth(0)).toContainText('172°')
    await expect(card.getByRole('definition').nth(1)).toContainText('135°')
    await expect(card.getByRole('definition').nth(1)).toContainText('↑ 15° since')
    await expect(card.getByText('Typical 180°')).toBeVisible()
    // The chart, laid out by Chromium at the card's real width: two points
    // per side, the right shoulder's latest (135°) drawn LOWER on screen
    // than the left's (172°).
    const left = card.locator('[data-side="left"] [data-point]')
    const right = card.locator('[data-side="right"] [data-point]')
    await expect(left).toHaveCount(2)
    await expect(right).toHaveCount(2)
    const leftBox = await left.last().boundingBox()
    const rightBox = await right.last().boundingBox()
    expect(rightBox!.y).toBeGreaterThan(leftBox!.y)
    // Wider than jsdom's fixed 320 px: measured, not assumed.
    expect((await card.locator('svg:has([data-typical])').boundingBox())!.width).toBeGreaterThan(400)

    // Recording today: the right shoulder only.
    await page.getByRole('link', { name: 'Record an assessment' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Record range of motion' })).toBeVisible()
    await expect(page.getByLabel('Measured on')).toHaveValue(todayInParis())
    const row = page.getByRole('group', { name: 'Movement 1' })
    await row.getByLabel('Movement', { exact: true }).selectOption('shoulder_abduction')
    await expect(row.getByText('Typical 180°')).toBeVisible()
    await row.getByLabel('Right', { exact: true }).fill('150')
    await page.getByRole('button', { name: 'Save the assessment' }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'Range of motion' })).toBeVisible()
    await expect(page.getByRole('region', { name: /^Notifications/ }).getByText('Assessment recorded.')).toBeVisible()
    await expect(card.getByRole('definition').nth(1)).toContainText('150°')
    await expect(card.getByRole('definition').nth(1)).toContainText('↑ 30° since')

    // Amending it: the newest assessment is the first.
    const newest = page.getByRole('list', { name: 'Assessments' }).getByRole('article').first()
    await expect(newest).toContainText('Shoulder abduction, right, active150°')
    await newest.getByRole('link', { name: /^Amend:/ }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Amend an assessment' })).toBeVisible()
    const amended = page.getByRole('group', { name: 'Movement 1' })
    await expect(amended.getByLabel('Right', { exact: true })).toHaveValue('150')
    await amended.getByLabel('Right', { exact: true }).fill('145')
    await page.getByLabel('Why are you amending it?').fill('Read the goniometer wrong')
    await page.getByRole('button', { name: 'Save the amendment' }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'Range of motion' })).toBeVisible()
    await expect(page.getByRole('region', { name: /^Notifications/ }).getByText('Amendment saved.')).toBeVisible()
    await expect(card.getByRole('definition').nth(1)).toContainText('145°')
    const corrected = page.getByRole('list', { name: 'Assessments' }).getByRole('article').first()
    await expect(corrected).toContainText('Read the goniometer wrong')
    await corrected.getByRole('button', { name: 'Show the original' }).click()
    await expect(corrected.getByRole('list', { name: 'Earlier versions' })).toContainText(
      'Shoulder abduction, right, active150°',
    )
  })

  test("records measurements for a visit from the medical file, that visit's note chosen", async ({ page }) => {
    await page.goto(`/practitioner/patients/${patId}/medical-file`)
    const note = page.getByRole('list', { name: 'Entries' }).getByRole('article').first()
    const heading = await note.getByRole('heading', { level: 2 }).textContent()
    await note.getByRole('link', { name: /^Record measurements for this visit:/ }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Record range of motion' })).toBeVisible()
    // The select shows that note, by the same heading.
    const chosen = page.getByLabel('Visit note (optional)').locator('option:checked')
    await expect(chosen).toHaveText(heading ?? 'missing')
  })
})

test.describe('the patient', () => {
  test.use({ storageState: stateFile('pat'), viewport: { width: 375, height: 740 } })

  test('reads the same card in My records, the typical value as a guide, nothing to change', async ({ page }) => {
    await page.goto('/profile/records')
    const section = page.getByRole('region', { name: 'Range of motion' })
    await expect(section.getByText(/^How far your joints moved/)).toBeVisible()
    const card = section.getByRole('article', { name: CARD })
    await expect(card.getByText('Typical: 180° (a guide, not a target)')).toBeVisible()
    await expect(section.getByRole('link')).toHaveCount(0)
    // At a phone's width the page doesn't scroll sideways.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
