/*
    Copyright 2026 Julien Javelaud

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
// -----------------------------------------------------------------------------------------------------------

import { ApiError } from '@/api/client'
import { failureText, hasMessage } from '@/api/apiErrors'
import type { RecordsExportLinkSummary, UnusableLinkReason } from './types'

// The records export screens' small rules (decisions §20, pass 3) — pure,
// tested on their own (recordsExportRules.test.ts), so the components only
// arrange what these decide.

// --- The backend's numbers and words, mirrored --------------------------------
//
// Hand-written copies (records-export-links.service.ts and the schema there):
// the screens say them BEFORE the backend does (the admin's dialog, the
// link's page), so they can't be read from an answer.

// How long a link works.
export const LINK_VALIDITY_HOURS = 72
// Wrong dates of birth that end a link.
export const DATE_OF_BIRTH_ATTEMPTS = 5
// The 400 for a wrong date of birth — told apart from the DTO's own 400s (a
// malformed date) by its exact words, the app's rule (api/apiErrors.ts).
export const WRONG_DATE_OF_BIRTH_MESSAGE = "This date of birth doesn't match the one on file."

// The name to save under when the answer's own can't be read (an older
// backend that doesn't expose Content-Disposition across origins).
export const FALLBACK_FILE_NAME = 'stride-health-record.pdf'

// --- The browser's time zone -------------------------------------------------

// "Europe/Paris" — the zone this device is set to, sent with every download
// so the copy's dates read as the patient knows them (a session at 23:30 in
// Montreal is the next day in UTC). The Intl API answers with the operating
// system's setting; nothing is asked of the person.
export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

// --- A failed download, in plain words ---------------------------------------

// For any download (My records, the link's page) that wasn't a refusal the
// page handles itself:
//   - 429: the backend allows 5 copies a minute. Its own sentence (since
//     2026-10-27, config/rate-limits.ts) speaks of "attempts", for every
//     route; here the exact word is "downloads". Retry-After says how long
//     to wait, when the browser lets the app read it (the backend exposes
//     it — cors-options.ts);
//   - 5xx: a sentence about THIS action (the copy), more exact than the
//     app's general one;
//   - anything else: the app's one rule (failureText, api/apiErrors.ts) —
//     a refusal's own words, or the network.
export function downloadFailureText(error: unknown): string {
  if (!(error instanceof ApiError)) return failureText(error)
  if (error.statusCode === 429) {
    const wait = error.retryAfterSeconds
    return wait === undefined || Number.isNaN(wait)
      ? 'Too many downloads in a short time. Wait a minute, then try again.'
      : `Too many downloads in a short time. Try again in ${secondsText(wait)}.`
  }
  if (error.statusCode >= 500) {
    return "Your copy couldn't be made just now. Try again in a moment."
  }
  return failureText(error)
}

function secondsText(seconds: number): string {
  return seconds === 1 ? '1 second' : `${seconds} seconds`
}

// --- The link's page: what a refusal means -----------------------------------
//
// Three refusals the page answers in its own way (anything else is a plain
// failure, above):
//   - not_valid (404): no link has this token — mistyped, or cut short by
//     the mail program;
//   - unusable (410): the link existed but no longer works; `reason` says
//     why, so the page picks what to add from it, never from the English;
//   - wrong_date (400): the date of birth didn't match; `attemptsLeft` says
//     how many tries remain (the fifth wrong one is a 410 `locked` instead).
export type LinkRefusal =
  | { kind: 'not_valid'; message: string }
  | { kind: 'unusable'; reason: UnusableLinkReason | null; message: string }
  | { kind: 'wrong_date'; message: string; attemptsLeft: number | null }

const UNUSABLE_REASONS: readonly string[] = ['used', 'replaced', 'locked', 'expired']

export function linkRefusal(error: unknown): LinkRefusal | null {
  if (!(error instanceof ApiError)) return null
  const message = failureText(error)
  if (error.statusCode === 404) return { kind: 'not_valid', message }
  if (error.statusCode === 410) {
    // Body fields are `unknown` (ApiError): narrowed against the known list,
    // so a value this page doesn't know just means "no particular heading".
    const { reason } = error.body
    return {
      kind: 'unusable',
      reason:
        typeof reason === 'string' && UNUSABLE_REASONS.includes(reason)
          ? (reason as UnusableLinkReason)
          : null,
      message,
    }
  }
  if (hasMessage(error, 400, WRONG_DATE_OF_BIRTH_MESSAGE)) {
    const { attemptsLeft } = error.body
    return {
      kind: 'wrong_date',
      message,
      attemptsLeft: typeof attemptsLeft === 'number' ? attemptsLeft : null,
    }
  }
  return null
}

// What the "can't be used" page adds to the backend's message (which says
// why and names the next step: "Ask your clinic for a new one"). Only for
// the two reasons where SOMEONE ELSE may have the link: a link used, or
// locked by wrong dates, by a person who isn't the patient. The clinic can
// see who downloaded when (the user page, the audit log) — but only if the
// patient tells them. Replaced and expired need nothing more.
export const UNUSABLE_WARNINGS: Partial<Record<UnusableLinkReason, string>> = {
  used: "If you didn't download it yourself, tell your clinic: someone else may have opened the link.",
  locked: "If you didn't type those dates, tell your clinic: someone else may have tried the link.",
}

// Under a wrong date of birth: how many tries remain — and, before the last
// one, what happens after it.
export function attemptsLeftText(attemptsLeft: number): string {
  return attemptsLeft === 1
    ? '1 try left. After one more wrong date, this link stops working.'
    : `${attemptsLeft} tries left.`
}

// The link page's own check before sending anything: a date was chosen. A
// date input holds '' until a whole, real date is entered — it never holds
// a half-typed one — so "empty" is the only case to catch here; the backend
// still checks the format.
export function dateOfBirthError(value: string): string | null {
  return value === '' ? 'Enter your date of birth' : null
}

// --- The admin's list of links -----------------------------------------------

// A moment to the minute, in the viewer's language and zone ("27 Oct 2026,
// 14:05") — a link lives 72 hours, so the time matters, not just the day.
// `locale` and `timeZone` are for tests.
export function formatLinkMoment(value: string, locale?: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(new Date(value))
}

export interface LinkDescription {
  // The short label beside the link.
  label: string
  // What happened to it, in a sentence or two.
  text: string
  // Something for the admin to act on: the email never left, so the
  // patient doesn't have the link.
  needsAction: boolean
}

// One link as the admin reads it. The first sentence says who sent it and
// whether its email LEFT (the link exists either way — saying "Sent" for one
// whose email failed would hide why the patient never got it); the second,
// what became of it.
export function describeLink(
  link: RecordsExportLinkSummary,
  locale?: string,
  timeZone?: string,
): LinkDescription {
  const at = (value: string) => formatLinkMoment(value, locale, timeZone)
  const sender = `${link.sentBy.firstName} ${link.sentBy.lastName}`
  const emailFailed = link.emailSentAt === null
  const sent = emailFailed
    ? `Created by ${sender} on ${at(link.createdAt)}, but the email couldn't be sent.`
    : `Sent by ${sender} on ${at(link.createdAt)}.`
  // Wrong dates typed on a link that's still open or ended otherwise:
  // someone tried. (A locked link's own sentence says it instead.)
  const failures =
    link.dateOfBirthFailures > 0
      ? ` ${link.dateOfBirthFailures} wrong date${link.dateOfBirthFailures === 1 ? '' : 's'} of birth typed.`
      : ''

  switch (link.status) {
    case 'open':
      return emailFailed
        ? {
            label: 'Email not sent',
            text: `${sent} The patient never received this link — send another one.${failures}`,
            needsAction: true,
          }
        : {
            label: 'Not used yet',
            text: `${sent} Works until ${at(link.expiresAt)}.${failures}`,
            needsAction: false,
          }
    case 'used':
      return {
        label: 'Downloaded',
        // usedAt is always set for a used link (that's what "used" means);
        // the fallback only keeps the type honest.
        text: `${sent} Downloaded on ${link.usedAt ? at(link.usedAt) : 'an unknown date'}.${failures}`,
        needsAction: false,
      }
    case 'replaced':
      return {
        label: 'Replaced',
        text: `${sent} Replaced by a newer link on ${link.replacedAt ? at(link.replacedAt) : 'an unknown date'}.${failures}`,
        needsAction: false,
      }
    case 'locked':
      return {
        label: 'Locked',
        text: `${sent} Locked after ${DATE_OF_BIRTH_ATTEMPTS} wrong dates of birth — it no longer works.`,
        needsAction: false,
      }
    case 'expired':
      return {
        label: 'Expired',
        text: `${sent} Expired on ${at(link.expiresAt)} without being used.${failures}`,
        needsAction: false,
      }
  }
}