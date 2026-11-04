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

// What the messaging API answers (Phase 5 — the backend's
// src/messaging/message-rules.ts and messaging-events.ts). Moments are ISO
// strings: JSON has no date type, and the screens format them for display
// only (messageText.ts).

// One message, as served. A deleted message keeps its place in the thread
// but not its text: `messageBody` is null and `deletedAt` says when — for
// EVERYONE, the sender included. The words ("Message deleted") are the
// screen's.
export interface Message {
  id: number
  conversationId: number
  senderId: number
  messageBody: string | null
  sentAt: string
  readAt: string | null
  deletedAt: string | null
}

export type ReadOnlyReason = 'care_team_ended' | 'patient_deactivated'

// One conversation from MY point of view — the list's rows and the
// thread's header.
export interface ConversationSummary {
  id: number
  otherParticipant: {
    id: number
    firstName: string
    lastName: string
    avatarUrl: string | null
  }
  // The newest message (a deleted one too, without its text); null while
  // nobody has written yet.
  lastMessage: Message | null
  // Messages from the other person I haven't read.
  unreadCount: number
  // When I archived it; null = in my list.
  archivedAt: string | null
  // Whether I can write here NOW: we are on a care team together, and the
  // patient's account is active. false = a read-only history (decided
  // 2026-10-20; the account since 2026-10-27, decisions §22).
  canSend: boolean
  // WHY it's read-only (null while canSend): the link ended, or the patient's
  // account is deactivated — the backend works it out from the same database
  // functions as canSend, so the two never disagree.
  readOnlyReason: ReadOnlyReason | null
  createdAt: string
}

// One page of a thread: oldest first; `hasMore` = older messages exist
// (asked for with `?before=<the first message's id>`).
export interface MessagesPage {
  messages: Message[]
  hasMore: boolean
}

// What PATCH /conversations/:id/read answers: which messages became read,
// and when (nothing new → readAt null, messageIds []).
export interface ReadReceipt {
  conversationId: number
  readAt: string | null
  messageIds: number[]
}

// The events the server pushes over the socket (the backend's
// ServerEvents). The names are the contract between the two sides.
export interface ServerEvents {
  newMessage: Message
  messageDeleted: Message
  conversationRead: {
    conversationId: number
    readerId: number
    readAt: string
    messageIds: number[]
  }
  conversationArchived: { conversationId: number; archivedAt: string | null }
}

// What every event the CLIENT sends answers through its acknowledgement:
// the REST answer, or the REST status and message (the backend's
// WsHttpExceptionFilter).
export type SocketAnswer<T> =
  | { ok: true; data: T }
  // A 500 carries the request id the backend made for it (its log line and
  // error report carry the same) — shown as "Reference: …".
  | { ok: false; status: number; message: string[]; requestId?: string }