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
  // Whether I can write here NOW: we are on a care team together. false =
  // a read-only history (decided 2026-10-20).
  canSend: boolean
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
  | { ok: false; status: number; message: string[] }