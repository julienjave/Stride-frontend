import { expect } from '@playwright/test'
import { MAILPIT_URL } from './addresses.ts'

// Reads an email the backend sent, from Mailpit's HTTP API — the way the
// person reading it in Mailpit's inbox would, minus the clicking. Used by the
// invitation test: the link to accept it exists ONLY in the email (its token
// is hashed in the database), so a real end-to-end test has to read the
// email itself.
//
// Mailpit's API (v1): GET /api/v1/search?query=… lists matching messages,
// newest first; GET /api/v1/message/:id gives one with its Text body.
interface SearchAnswer {
  messages: { ID: string }[]
}
interface Message {
  Text: string
}

// The text of the newest email to an address, waited for: the backend sends
// it AFTER answering the request (decisions §3 — the email is sent once the
// account is committed), so it can arrive a moment after the screen says
// "sent". expect.poll asks again until the check passes or 10 s pass.
export async function latestEmailText(to: string): Promise<string> {
  let text = ''
  await expect
    .poll(
      async () => {
        const query = encodeURIComponent(`to:"${to}"`)
        const found = (await (await fetch(`${MAILPIT_URL}/api/v1/search?query=${query}`)).json()) as SearchAnswer
        if (found.messages.length === 0) return false
        const message = (await (await fetch(`${MAILPIT_URL}/api/v1/message/${found.messages[0].ID}`)).json()) as Message
        text = message.Text
        return true
      },
      { message: `an email to ${to} in Mailpit`, timeout: 10_000 },
    )
    .toBe(true)
  return text
}

// The first link in a text that starts with `prefix` — e.g. the invitation's
// http://localhost:4174/accept-invitation?token=…
export function linkIn(text: string, prefix: string): string {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`${escaped}\\S+`).exec(text)
  if (!match) throw new Error(`No link starting with ${prefix} in:\n${text}`)
  return match[0]
}
