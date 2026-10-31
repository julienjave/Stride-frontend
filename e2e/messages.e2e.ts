import { expect, test, type Page } from '@playwright/test'
import { stateFile } from './support/accounts.ts'

// Phases 5 and 6's demo targets (roadmap): a practitioner and a patient hold
// a LIVE conversation in two open browser windows; and a practitioner adds an
// entry to the patient's medical file.

test('a practitioner and a patient talk live, in two windows', async ({ browser }) => {
  // Two browser CONTEXTS: two separate cookie jars — two people on two
  // computers, each with their own session and their own socket.
  const alexContext = await browser.newContext({ storageState: stateFile('alex') })
  const patContext = await browser.newContext({
    storageState: stateFile('pat'),
    viewport: { width: 375, height: 740 },
  })
  const alex = await alexContext.newPage()
  const pat = await patContext.newPage()

  // Both open their conversation — and stay on it.
  await openConversation(alex, '/practitioner/messages', 'Pat Lee')
  await openConversation(pat, '/patient/messages', 'Alex Chen')

  // A unique text per run: the seeded history holds other messages.
  const question = `Is the band exercise still needed? (${Date.now()})`
  await send(pat, question)

  // It arrives on Alex's screen WITHOUT a reload — through the socket.
  // Scoped to the thread (role="log"): the conversation list's preview
  // repeats the text.
  await expect(alex.getByRole('log').getByText(question)).toBeVisible()

  const answer = `Yes, twice a week. (${Date.now()})`
  await send(alex, answer)
  await expect(pat.getByRole('log').getByText(answer)).toBeVisible()

  await alexContext.close()
  await patContext.close()
})

test.describe('the medical file (Phase 6)', () => {
  test.use({ storageState: stateFile('alex') })

  test('a practitioner adds an entry, confirmed by a snackbar', async ({ page }) => {
    await page.goto('/practitioner/patients')
    await page.getByRole('link', { name: /Pat Lee/ }).first().click()
    await page.getByRole('link', { name: /medical file/i }).first().click()
    await expect(page.getByRole('heading', { level: 1, name: 'Medical file' })).toBeVisible()

    const plan = `Progress the band exercise next week. (${Date.now()})`
    await page.getByRole('link', { name: 'Add an entry' }).click()
    await page.getByLabel('Type of entry').selectOption({ label: 'Progress note' })
    await page.getByLabel('Plan').fill(plan)
    await page.getByRole('button', { name: 'Save the entry' }).click()

    // Back on the file: the snackbar (decisions §33) and the new entry, first.
    await expect(page.getByRole('heading', { level: 1, name: 'Medical file' })).toBeVisible()
    await expect(page.getByRole('region', { name: /^Notifications/ }).getByText('Entry added.')).toBeVisible()
    await expect(page.getByRole('list', { name: 'Entries' }).getByRole('listitem').first()).toContainText(plan)
  })
})

async function openConversation(page: Page, messagesPath: string, other: string): Promise<void> {
  await page.goto(messagesPath)
  await page.getByRole('link', { name: new RegExp(other) }).first().click()
  await expect(page.getByRole('log', { name: `Messages with ${other}` })).toBeVisible()
}

async function send(page: Page, text: string): Promise<void> {
  // The button is named "Connecting…" until the socket is up, and stays
  // disabled while the box is empty (a blank message can't be sent): typed
  // first, then waiting for an ENABLED "Send" is waiting for the live
  // connection.
  await page.getByLabel('Message', { exact: true }).fill(text)
  const sendButton = page.getByRole('button', { name: 'Send', exact: true })
  await expect(sendButton).toBeEnabled()
  await sendButton.click()
  // Stored once the box is empty again (it waits for the server's
  // acknowledgement — decisions §7).
  await expect(page.getByLabel('Message', { exact: true })).toHaveValue('')
}
