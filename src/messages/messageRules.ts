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

import { localDateString } from '@/common/calendarDate'
import type { ConversationSummary, Message, MessagesPage } from './types'

// The messaging screens' decisions, as pure functions (the shape of
// teamRules.ts and scoreRules.ts): data in, data out, tested with plain
// values. The components only draw what these return.

// The longest message — the backend's MESSAGE_MAX_LENGTH (the DTO and the
// database CHECK). Repeated here so the composer can say it BEFORE sending;
// the server still decides.
export const MESSAGE_MAX_LENGTH = 5000

// --- A thread's pages -----------------------------------------------------------
//
// The thread is an INFINITE query: page 0 is the newest page, each next page
// is OLDER (fetched with `before` = the first message's id of the oldest
// page so far). Each page is oldest-first inside. So the whole thread,
// oldest first, is the pages in REVERSE order, flattened.
export function threadMessages(pages: readonly MessagesPage[]): Message[] {
  return [...pages].reverse().flatMap((page) => page.messages)
}

// The cursor for the next (older) page: the oldest message loaded so far —
// or undefined, which tells TanStack Query there is nothing more.
export function olderPageParam(oldestPage: MessagesPage): number | undefined {
  return oldestPage.hasMore ? oldestPage.messages[0]?.id : undefined
}

// --- Days -----------------------------------------------------------------------

export interface DayGroup {
  day: string
  messages: Message[]
}

// Consecutive messages grouped by the VIEWER's calendar day (each group gets
// a "Today" / "Monday 19 October" separator). The moment is the server's
// (UTC); the day is the viewer's local one — a message sent at 23:30 in
// Paris belongs to that evening, not to the next UTC day.
export function groupByDay(messages: readonly Message[]): DayGroup[] {
  const groups: DayGroup[] = []
  for (const message of messages) {
    const day = localDateString(new Date(message.sentAt))
    const last = groups.at(-1)
    if (last && last.day === day) last.messages.push(message)
    else groups.push({ day, messages: [message] })
  }
  return groups
}

// --- Reading --------------------------------------------------------------------

// The newest message from the OTHER person that I haven't read, or null —
// what the thread watches to mark itself read. Deleted messages don't count
// (nothing left to read — the backend never marks them).
export function newestUnreadFrom(messages: readonly Message[], myId: number): number | null {
  let newest: number | null = null
  for (const message of messages) {
    if (message.senderId !== myId && message.readAt === null && message.deletedAt === null) {
      newest = newest === null ? message.id : Math.max(newest, message.id)
    }
  }
  return newest
}

// --- Read receipts --------------------------------------------------------------
//
// "Seen" goes under ONE message: mine, read, and the newest message still
// standing in the thread (deleted ones skipped — a deletion leaves no text
// to have seen, so it shouldn't hide the receipt of the message before it).
//
// One label is enough: the server marks EVERY unread message read at once
// (PATCH …/read), so if my newest message is read, all of mine before it are
// too. And once the other person has replied, the reply itself says they
// read it — the label would only repeat it. (Decided 2026-10-20.)
export function seenMessage(messages: readonly Message[], myId: number): Message | null {
  const newest = messages.findLast((message) => message.deletedAt === null)
  if (!newest || newest.senderId !== myId || newest.readAt === null) return null
  return newest
}

// --- Deleting -------------------------------------------------------------------

// How long a message of mine can still be deleted — the backend's
// DELETE_WINDOW_MS (message-rules.ts; 0048's trigger holds the same 15
// minutes). Repeated here so the screen offers Delete only while it would
// succeed; the server still decides.
export const DELETE_WINDOW_MS = 15 * 60 * 1000

// The last moment (epoch ms) at which I can delete this message, or null if
// I can't at all: it isn't mine, the other person has read it, or it is
// deleted already. The server's own rule, "at most 15 minutes" — at exactly
// 15 minutes it can still go (the trigger's `now() - sent_at > 15 minutes`
// refuses only past it), so the moment itself is included.
//
// Time is the one part the screen can only estimate: `sentAt` is the
// SERVER's clock, the countdown runs on THIS device's clock. A device a
// minute fast hides Delete a minute early; one a minute slow offers it a
// minute too long — and the server then refuses with its own words (409),
// which the dialog shows. The server stays the judge.
export function deletableUntil(message: Message, myId: number): number | null {
  if (message.senderId !== myId || message.readAt !== null || message.deletedAt !== null) return null
  return Date.parse(message.sentAt) + DELETE_WINDOW_MS
}

// --- The list -------------------------------------------------------------------

export function splitArchived(conversations: readonly ConversationSummary[]): {
  inbox: ConversationSummary[]
  archived: ConversationSummary[]
} {
  return {
    inbox: conversations.filter((c) => c.archivedAt === null),
    archived: conversations.filter((c) => c.archivedAt !== null),
  }
}

// The tab badge and the home's count: every unread message, archived
// conversations included (a new message unarchives anyway; an unread one
// from before archiving is still unread).
export function unreadTotal(conversations: readonly ConversationSummary[]): number {
  return conversations.reduce((total, c) => total + c.unreadCount, 0)
}

// Newest activity first — the backend's own order (compareByActivity), so
// a list re-sorted here after a live message matches the next refetch.
export function compareByActivity(a: ConversationSummary, b: ConversationSummary): number {
  const at = (c: ConversationSummary) => Date.parse(c.lastMessage?.sentAt ?? c.createdAt)
  return at(b) - at(a) || b.id - a.id
}

// --- Writing --------------------------------------------------------------------

export type MessageProblem = 'blank' | 'too_long'

// What the server would refuse, said before sending: no non-space character
// (the backend's `\S`), or over the limit. `length` counts UTF-16 units, as
// the backend's class-validator does.
export function messageProblem(text: string): MessageProblem | null {
  if (!/\S/.test(text)) return 'blank'
  if (text.length > MESSAGE_MAX_LENGTH) return 'too_long'
  return null
}