import { expect, test } from '@playwright/test'
import { stateFile } from './support/accounts.ts'

// Phase 3's demo target (roadmap): a practitioner assembles a template from
// the exercise library and assigns it to a patient on a real schedule —
// "moving around the app through the shared navigation, not Back buttons".
test.use({ storageState: stateFile('alex') })

test('a practitioner builds a template and assigns it on a schedule', async ({ page }) => {
  await page.goto('/practitioner')
  await page.getByRole('navigation', { name: 'Sections' }).first().getByRole('link', { name: 'Programs' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'My Programs' })).toBeVisible()

  // A new template.
  await page.getByRole('link', { name: '+ Add New Template' }).click()
  await page.getByLabel('Title').fill('E2E Shoulder Basics')
  await page.getByRole('button', { name: 'Create Template' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'E2E Shoulder Basics' })).toBeVisible()

  // An exercise from the library, through the picker, with its prescription.
  await page.getByRole('link', { name: 'Add New Exercise' }).click()
  await page.getByRole('link', { name: 'Select from Library' }).click()
  await expect(page.getByRole('heading', { name: 'Select an Exercise' })).toBeVisible()
  // `main`: the navigation also has a "Library" link; the picker's cards are
  // in the page itself.
  await page.getByRole('main').getByRole('link', { name: /^Heel Slides/ }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Heel Slides' })).toBeVisible()
  await page.getByLabel('Sets').fill('2')
  await page.getByLabel('Reps').fill('12')
  await page.getByRole('button', { name: 'Add', exact: true }).click()

  // Back on the template, the exercise listed with what was prescribed.
  const exercises = page.getByRole('region', { name: 'Exercises' })
  await expect(exercises.getByRole('link', { name: /Heel Slides .* 2 sets · 12 reps/ })).toBeVisible()

  // Assigned to Jo, on Mondays and Thursdays.
  await page.getByRole('link', { name: 'Assign to a patient' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Assign a program' })).toBeVisible()
  // The template is preselected (?templateId=); the title follows it.
  await expect(page.getByLabel('Title')).toHaveValue('E2E Shoulder Basics')
  // The option's words include the date of birth in the browser's locale
  // (en-GB here: "Jo Novak · born 30 September 1975"): the option is found
  // by the NAME, and chosen by its value (the patient's id).
  const jo = page.getByLabel('Patient').locator('option', { hasText: 'Jo Novak' })
  await page.getByLabel('Patient').selectOption((await jo.getAttribute('value')) ?? '')
  await page.getByRole('checkbox', { name: 'Monday' }).check()
  await page.getByRole('checkbox', { name: 'Thursday' }).check()
  // The schedule in words, BEFORE saving (decisions §5).
  await expect(page.getByText('Schedule: Mon · Thu')).toBeVisible()
  await page.getByRole('button', { name: 'Assign program' }).click()

  // The program page: whose it is, who assigned it, the schedule — the
  // weekday-free facts (what's "up next" moves with the calendar).
  await expect(page.getByRole('heading', { level: 1, name: 'E2E Shoulder Basics' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Jo Novak' }).first()).toBeVisible()
  await expect(page.getByText('Assigned by you')).toBeVisible()
  const progress = page.getByRole('region', { name: 'Schedule & progress' })
  await expect(progress.getByText('Schedule: Mon · Thu')).toBeVisible()
  await expect(progress.getByText('0 sessions done')).toBeVisible()

  // And it is on the patient's page, reached through the navigation.
  await page.getByRole('navigation', { name: 'Sections' }).first().getByRole('link', { name: 'Patients' }).click()
  await page.getByRole('link', { name: /Jo Novak/ }).first().click()
  await expect(page.getByRole('region', { name: 'Programs' }).getByText('E2E Shoulder Basics')).toBeVisible()
})
