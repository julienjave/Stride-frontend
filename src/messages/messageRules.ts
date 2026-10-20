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