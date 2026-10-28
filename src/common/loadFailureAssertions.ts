import { expect } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { SERVER_PROBLEM_TEXT } from '@/api/apiErrors'

// Shared by the page tests of the load-error pass (Phase 6, 2026-10-28):
// every page that loads something says the same things the same way, so
// its tests check them the same way.

// A backend error as the API client reads it (api/client.ts takes the
// status from the BODY's statusCode).
export function errorResponse(statusCode: number, message: string[] = ['Internal server error']) {
  return new Response(
    JSON.stringify({ statusCode, message, error: 'Error', timestamp: '', path: '' }),
    { status: statusCode, headers: { 'Content-Type': 'application/json' } },
  )
}

function literal(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// A record that doesn't exist (`RecordNotFound`): its heading, the one
// sentence, exactly these ways out — and no "Try again" (asking again can't
// change a 404).
export async function expectRecordNotFound(noun: string, links: [string, string][]) {
  const title = `${noun[0].toUpperCase()}${noun.slice(1)} not found`
  const heading = await screen.findByRole('heading', { level: 1, name: title })
  // The block itself (NotAvailable: the heading, the sentence, the links) —
  // a test's own controls elsewhere on screen don't count.
  const block = within(heading.parentElement as HTMLElement)
  expect(block.getByRole('alert')).toHaveTextContent(
    new RegExp(`^There's no ${literal(noun)} at this address\\. The link may be wrong or out of date\\.$`),
  )
  expect(
    block.getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')]),
  ).toStrictEqual(links)
  expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
}

// Any other failure: what couldn't be loaded, WHY (a 5xx by default — the
// shared sentence), and "Try again".
export async function expectLoadError(what: string, reason: string = SERVER_PROBLEM_TEXT) {
  expect(await screen.findByRole('alert')).toHaveTextContent(
    new RegExp(`^Couldn't load ${literal(what)}\\. ${literal(reason)}$`),
  )
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
}

// "Try again", and the retry works (the test has queued the good answer):
// the heading of what appeared takes keyboard focus (useRetryFocus).
export async function retryThenExpectFocusOn(
  user: UserEvent,
  heading: { level: number; name: string | RegExp },
) {
  await user.click(screen.getByRole('button', { name: 'Try again' }))
  const target = await screen.findByRole('heading', heading)
  await waitFor(() => expect(target).toHaveFocus())
}