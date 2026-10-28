import { addDays, localDateString } from '@/common/calendarDate'
import { MESSAGE_MAX_LENGTH, type MessageProblem } from './messageRules'
import type { ConversationSummary } from './types'

// Every sentence the messaging screens show, in one place (the shape of
// teamText.ts). `locale` is a parameter so tests can pin it; the app passes
// nothing and gets the browser's.

export const DELETED_TEXT = 'Message deleted'
export const NO_MESSAGES_TEXT = 'No messages yet'
// The server's own sentence for a refused send — repeated for the banner
// shown BEFORE trying, so the two read alike.
export const READ_ONLY_TEXT =
  "You're no longer on a care team together, so this conversation is read-only."
export const READ_ONLY_SHORT_TEXT = 'Read only'

// The banner where the box would be, by reason (decisions §22). A
// deactivated patient's conversation is only ever opened by a practitioner
// (the patient can't sign in), so its words are written for them: whose
// account, and who can change it. Any other reason — or none given — gets
// the ended care team's sentence, the only one before 2026-10-27.
export function readOnlyText(summary: Pick<ConversationSummary, 'readOnlyReason' | 'otherParticipant'>): string {
  if (summary.readOnlyReason === 'patient_deactivated') {
    return `${summary.otherParticipant.firstName}'s account is deactivated, so this conversation is read-only until an admin reactivates it.`
  }
  return READ_ONLY_TEXT
}

export function personName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`
}

// The list row's preview: "You: …" for my own last message, the text
// otherwise; a deleted one says so. Only the first line — the row is one
// line, the CSS cuts what's left.
export function previewText(summary: ConversationSummary, myId: number): string {
  const last = summary.lastMessage
  if (!last) return NO_MESSAGES_TEXT
  if (last.messageBody === null) return DELETED_TEXT
  const firstLine = last.messageBody.trim().split('\n')[0]
  return last.senderId === myId ? `You: ${firstLine}` : firstLine
}

// The list row's moment: the time today, the weekday within the last week,
// the date otherwise (the year only when it isn't this one) — what a phone's
// messages app shows.
export function listTimeText(sentAt: string, now: Date = new Date(), locale?: string): string {
  const moment = new Date(sentAt)
  const day = localDateString(moment)
  const today = localDateString(now)
  if (day === today) return messageTimeText(sentAt, locale)
  if (day > addDays(today, -7)) {
    return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(moment)
  }
  const sameYear = moment.getFullYear() === now.getFullYear()
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(moment)
}

// A message's own time, under its bubble.
export function messageTimeText(sentAt: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(
    new Date(sentAt),
  )
}

// The read receipt under my newest message (decided 2026-10-20: with the
// time). Read the SAME day it was sent → the time alone: the day separator
// above already says which day. Read later → the day too: the weekday within
// a week of sending ("Seen Tue 14:05"), the date beyond ("Seen Jun 9,
// 14:05"; the year only if it differs from the sending's). Compared with
// the sending, not with "now": the receipt then says the same thing
// whenever the thread is opened, and the function needs no clock.
export function seenText(readAt: string, sentAt: string, locale?: string): string {
  const read = new Date(readAt)
  const sent = new Date(sentAt)
  const readDay = localDateString(read)
  const sentDay = localDateString(sent)
  if (readDay === sentDay) return `Seen ${messageTimeText(readAt, locale)}`
  const time = { hour: 'numeric', minute: '2-digit' } as const
  if (readDay <= addDays(sentDay, 6)) {
    return `Seen ${new Intl.DateTimeFormat(locale, { weekday: 'short', ...time }).format(read)}`
  }
  const sameYear = read.getFullYear() === sent.getFullYear()
  return `Seen ${new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
    ...time,
  }).format(read)}`
}

// The trash button's accessible name: an icon says nothing to a screen
// reader, and several of my messages can carry one at once — the time says
// WHICH.
export function deleteMessageLabel(sentAt: string, locale?: string): string {
  return `Delete your message sent at ${messageTimeText(sentAt, locale)}`
}

export const DELETE_TITLE = 'Delete this message?'
export const DELETE_DESCRIPTION =
  "It will be removed for both of you, and shown as “Message deleted”. This can't be undone."

// A day separator in the thread. `day` is a local calendar date
// (YYYY-MM-DD, from groupByDay); it's formatted at local NOON, so no time
// zone can push it onto the neighbouring day.
export function dayLabel(day: string, now: Date = new Date(), locale?: string): string {
  const today = localDateString(now)
  if (day === today) return 'Today'
  if (day === addDays(today, -1)) return 'Yesterday'
  const [year, month, date] = day.split('-').map(Number)
  const noon = new Date(year, month - 1, date, 12)
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    ...(year === now.getFullYear() ? {} : { year: 'numeric' }),
  }).format(noon)
}

// The home slot's line and the tab badge's accessible name.
export function unreadCountText(count: number): string {
  if (count === 0) return 'No unread messages'
  return `${count} unread`
}

// The composer's refusal, before sending — the backend's words.
export function messageProblemText(problem: MessageProblem): string {
  return problem === 'blank'
    ? "A message can't be blank"
    : `A message can be at most ${MESSAGE_MAX_LENGTH} characters`
}

// Shown under the box once the text gets close to the limit (the last 10%),
// so the limit never comes as a surprise refusal.
export function charactersLeftText(length: number): string | null {
  const left = MESSAGE_MAX_LENGTH - length
  if (left > MESSAGE_MAX_LENGTH / 10) return null
  if (left < 0) return `${-left} characters over the limit`
  return left === 1 ? '1 character left' : `${left} characters left`
}

// A conversation that couldn't be started because no answer came (the
// network): "Message" on a profile and "New message" (Phase 6, the loading
// / error pass, pass 2 — before, they showed the error's own text, which for a
// dropped network is the browser's "Failed to fetch"). A refusal shows its
// words, a 5xx the shared sentence (`failureText`).
export const START_CONVERSATION_FAILED_TEXT = "Couldn't start the conversation. Check your connection and try again."