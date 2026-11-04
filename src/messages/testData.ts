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
    readOnlyReason: null,
    createdAt: '2031-06-01T08:00:00.000Z',
    ...fields,
  }
}

export function page(messages: Message[], hasMore = false): MessagesPage {
  return { messages, hasMore }
}