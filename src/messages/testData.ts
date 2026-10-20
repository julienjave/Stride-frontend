import type { ConversationSummary, Message, MessagesPage } from './types'

// Shared fixtures of the messaging tests. Alex (a practitioner, id 3) and
// Pat (a patient, id 6) — the Team tests' people. Moments in 2031, far
// from any real today (the project's rule for test clocks).

export const ALEX_ID = 3
export const PAT_ID = 6

export const ALEX_PERSON = { id: ALEX_ID, firstName: 'Alex', lastName: 'Chen', avatarUrl: null }
export const PAT_PERSON = { id: PAT_ID, firstName: 'Pat', lastName: 'Lee', avatarUrl: null }

// The signed-in users the pages read from the /auth/me cache.
export const ALEX_USER = {
  ...ALEX_PERSON,
  email: 'alex@example.com',
  roles: ['practitioner'],
  activeRole: 'practitioner',
}
export const PAT_USER = {
  ...PAT_PERSON,
  email: 'pat@example.com',
  roles: ['patient'],
  activeRole: 'patient',
}

// One message in conversation 12, from Pat, unread, sent at 09:00 + id
// minutes — so ids and times grow together, as they do for real.
export function message(id: number, fields: Partial<Message> = {}): Message {
  return {
    id,
    conversationId: 12,
    senderId: PAT_ID,
    messageBody: `Message ${id}`,
    sentAt: new Date(Date.UTC(2031, 5, 2, 9, id)).toISOString(),
    readAt: null,
    deletedAt: null,
    ...fields,
  }
}

// Conversation 12, seen by ALEX: with Pat, no message yet, nothing unread.
export function summary(fields: Partial<ConversationSummary> = {}): ConversationSummary {
  return {
    id: 12,
    otherParticipant: PAT_PERSON,
    lastMessage: null,
    unreadCount: 0,
    archivedAt: null,
    canSend: true,
    createdAt: '2031-06-01T08:00:00.000Z',
    ...fields,
  }
}

export function page(messages: Message[], hasMore = false): MessagesPage {
  return { messages, hasMore }
}