import { type RefObject, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import { ApiError } from '@/api/client'
import { SERVER_PROBLEM_TEXT } from '@/api/apiErrors'
import { LoadError, LoadFailure } from '@/common/LoadError'
import { NotAvailable } from '@/common/NotAvailable'
import { UserAvatar } from '@/common/UserAvatar'
import { useFocusAfterRetry, useRetryFocus } from '@/common/useRetryFocus'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { ArchiveConversationButton } from './ArchiveConversationButton'
import { DeleteMessageButton } from './DeleteMessageButton'
import { messagesPath, type MessagingRole } from './messagesPath'
import {
  deletableUntil,
  groupByDay,
  messageProblem,
  newestUnreadFrom,
  seenMessage,
  threadMessages,
} from './messageRules'
import {
  charactersLeftText,
  dayLabel,
  DELETED_TEXT,
  messageProblemText,
  messageTimeText,
  NO_MESSAGES_TEXT,
  personName,
  readOnlyText,
  seenText,
} from './messageText'
import { useMessagingConnection } from './messagingConnection'
import type { ConversationSummary, Message } from './types'
import { useConversation } from './useConversation'
import { useConversationMessages } from './useConversationMessages'
import { useMarkConversationRead } from './useMarkConversationRead'
import { MessageRefusedError } from './socketAnswer'
import { useSendMessage } from './useSendMessage'
import { useMessagingViewer } from './useMessagingViewer'
import { useStickToBottom } from './useStickToBottom'
import { Loading } from '@/common/Loading'

// One conversation — `/<role>/messages/:conversationId`: who, the thread,
// and the box to write in.
export function ConversationPage() {
  const { conversationId: param } = useParams<{ conversationId: string }>()
  const viewer = useMessagingViewer()
  const conversationId = Number(param)
  if (!viewer) return null
  if (!Number.isInteger(conversationId) || conversationId < 1) {
    return (
      <Pane>
        <ConversationNotAvailable role={viewer.role} />
      </Pane>
    )
  }
  // key: going from one conversation to another (desktop: a click in the
  // list — same route, new :id) mounts a FRESH view, so a half-typed
  // message, an error or the scroll position never carries over to the
  // wrong person.
  return <Conversation key={conversationId} conversationId={conversationId} {...viewer} />
}

function Conversation({
  conversationId,
  myId,
  role,
}: {
  conversationId: number
  myId: number
  role: MessagingRole
}) {
  const conversation = useConversation(conversationId)
  // After a "Try again" that worked — of the conversation, or of its
  // messages (Thread) — focus goes to its heading: the other person's name.
  const heading = useRetryFocus<HTMLHeadingElement>('this conversation', conversation.isSuccess)

  if (conversation.isError) {
    // 404: no such conversation, or one I'm not in (row security hides it);
    // 403: not one of mine (the service's own check, behind row security).
    // Either way, nothing to show — and the same words, so the page doesn't
    // reveal which ids exist. Anything else: "Try again".
    return (
      <Pane>
        <LoadFailure
          queries={[conversation]}
          what="this conversation"
          notAvailable={<ConversationNotAvailable role={role} />}
          isNotAvailable={isHiddenConversation}
        >
          <BackToMessages role={role} />
        </LoadFailure>
      </Pane>
    )
  }
  if (!conversation.isSuccess) return <Loading label="Loading the conversation…" className="p-4" />

  const summary = conversation.data
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Header summary={summary} role={role} heading={heading} />
      <Thread summary={summary} myId={myId} heading={heading} />
      {summary.canSend ? (
        <Composer conversationId={conversationId} />
      ) : (
        // An ended care-team link, or a deactivated patient (decisions §22):
        // the history stays readable, nothing more can be written (decided
        // 2026-10-20). Said once, where the box would be — not as an error
        // after a failed send — with the reason's own words.
        <p className="border-t bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          {readOnlyText(summary)}
        </p>
      )}
    </div>
  )
}

function Header({
  summary,
  role,
  heading,
}: {
  summary: ConversationSummary
  role: MessagingRole
  heading: RefObject<HTMLHeadingElement | null>
}) {
  const other = summary.otherParticipant
  return (
    // flex-wrap: an archive error takes a line of its own under the row.
    <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
      {/* Phones only: the list isn't beside the thread, so the way back is
          here. A link to the list's address, as everywhere in Stride (a
          "go back" in the history could leave the app). */}
      <Link
        to={messagesPath(role)}
        aria-label="Back to messages"
        className="-ml-2 rounded-md p-1 hover:bg-muted md:hidden"
      >
        <ChevronLeft aria-hidden="true" className="size-5" />
      </Link>
      <UserAvatar
        firstName={other.firstName}
        lastName={other.lastName}
        avatarUrl={other.avatarUrl}
        className="size-9 text-xs"
      />
      {/* flex-1 + min-w-0: the name takes the room left and is cut with
          "…" rather than pushing the button onto a new line. */}
      <h2 ref={heading} tabIndex={-1} className="min-w-0 flex-1 truncate text-lg font-semibold outline-none">
        {personName(other)}
      </h2>
      <ArchiveConversationButton summary={summary} role={role} />
    </div>
  )
}

function Thread({
  summary,
  myId,
  heading,
}: {
  summary: ConversationSummary
  myId: number
  heading: RefObject<HTMLHeadingElement | null>
}) {
  const thread = useConversationMessages(summary.id)
  // A retry of the messages that worked: focus on the conversation's heading
  // (the thread has none of its own; the newest messages follow it).
  useFocusAfterRetry(heading, 'the messages', thread.isSuccess)
  const messages = thread.data ? threadMessages(thread.data.pages) : []
  const scroller = useRef<HTMLDivElement>(null)
  const newest = messages.at(-1)

  useStickToBottom(scroller, {
    newestId: newest?.id ?? null,
    oldestId: messages[0]?.id ?? null,
    newestIsMine: newest?.senderId === myId,
  })
  // Looking at it = reading it (only once the thread is loaded: before
  // that `messages` is empty, and there is nothing to mark).
  useMarkConversationRead(summary.id, myId, newestUnreadFrom(messages, myId))

  const name = personName(summary.otherParticipant)
  // The one message that carries "Seen", if any (messageRules.ts).
  const seen = seenMessage(messages, myId)

  return (
    // The scrolling box. `min-h-0` lets this flex child shrink below its
    // content's height — without it, the thread would grow the page
    // instead of scrolling inside.
    <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
      {thread.isPending && <Loading label="Loading the messages…" />}
      {thread.isError && (
        <LoadError what="the messages" queries={[thread]} />
      )}
      {thread.hasNextPage && (
        <div className="mb-3 text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void thread.fetchNextPage()}
            disabled={thread.isFetchingNextPage}
          >
            {thread.isFetchingNextPage ? 'Loading…' : 'Load earlier messages'}
          </Button>
        </div>
      )}
      {thread.isSuccess && messages.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">{NO_MESSAGES_TEXT}</p>
      )}
      {/* role="log": a live region made for chat — a screen reader
          announces what's ADDED to it (a new message arriving) without
          moving the reader's focus, and doesn't re-read the rest. */}
      <div role="log" aria-label={`Messages with ${name}`} className="space-y-4">
        {groupByDay(messages).map((group) => (
          <section key={group.day} aria-label={dayLabel(group.day)} className="space-y-2">
            <p aria-hidden="true" className="text-center text-xs font-medium text-muted-foreground">
              {dayLabel(group.day)}
            </p>
            <ul className="space-y-2">
              {group.messages.map((message) => (
                <Bubble
                  key={message.id}
                  message={message}
                  myId={myId}
                  otherName={name}
                  seen={message.id === seen?.id}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

function Bubble({
  message,
  myId,
  otherName,
  seen,
}: {
  message: Message
  myId: number
  otherName: string
  // This message carries the read receipt.
  seen: boolean
}) {
  const mine = message.senderId === myId
  const deleted = message.deletedAt !== null
  // Where focus lands after deleting this message (DeleteMessageButton).
  const item = useRef<HTMLLIElement>(null)
  return (
    // tabIndex -1: focusable from code (after a deletion), but not a Tab
    // stop — a thread of 50 messages isn't 50 stops on the way to the box.
    <li
      ref={item}
      tabIndex={-1}
      className={cn(
        'flex flex-col rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2',
        mine ? 'items-end' : 'items-start',
      )}
    >
      <div
        className={cn(
          // max-w: a bubble never spans the whole pane (long lines are
          // hard to read); wrap-break-word + pre-wrap: the line breaks typed are
          // kept, and a long URL wraps instead of overflowing.
          'max-w-[80%] whitespace-pre-wrap wrap-break-word rounded-2xl px-3 py-2 text-sm',
          mine ? 'bg-primary text-primary-foreground' : 'bg-muted',
          deleted && 'italic opacity-70',
        )}
      >
        {/* Who wrote it, for a screen reader (sighted readers see it from
            the side of the bubble — information carried by position alone
            would be lost on them). */}
        <span className="sr-only">{mine ? 'You' : otherName}: </span>
        {deleted ? DELETED_TEXT : message.messageBody}
      </div>
      {/* The line under the bubble: its time, then — mine only — EITHER
          the receipt OR the trash button, never both: a message can be
          deleted only while unread, and "Seen" means it was read. */}
      <div className="mt-0.5 flex items-center gap-1 px-1 text-xs text-muted-foreground">
        <time dateTime={message.sentAt}>{messageTimeText(message.sentAt)}</time>
        {seen && message.readAt && (
          <>
            {/* The dot is decoration: a screen reader reads "14:02 Seen
                14:05", not "14:02 dot Seen 14:05". */}
            <span aria-hidden="true">·</span>
            <span>{seenText(message.readAt, message.sentAt)}</span>
          </>
        )}
        {/* `mine &&` changes no behaviour — deletableUntil already gives
            null for their messages (a mutation removing it survives,
            equivalent) — but the other person's bubbles then mount no
            mutation hook and no state for a button they can never have. */}
        {mine && (
          <DeleteMessageButton
            conversationId={message.conversationId}
            message={message}
            deadline={deletableUntil(message, myId)}
            focusAfterDelete={item}
          />
        )}
      </div>
    </li>
  )
}

// The box to write in. Sends over the socket and WAITS for the server's
// answer (decided 2026-10-20): while it travels the text stays in the box
// (read-only) and the button says "Sending…"; the box empties only once
// the message is stored; a refusal shows the server's reason and keeps the
// text, to fix or copy.
function Composer({ conversationId }: { conversationId: number }) {
  const [text, setText] = useState('')
  const { connected } = useMessagingConnection()
  const send = useSendMessage(conversationId)
  const problem = messageProblem(text)
  const left = charactersLeftText(text.length)
  // Blank or too long: the button simply can't be pressed. "Blank" needs no
  // message (an empty box explains itself); "too long" is said by the
  // characters-left line.
  const canSend = connected && !send.isPending && problem === null

  function submit(event?: FormEvent) {
    event?.preventDefault()
    if (!canSend) return
    send.mutate(text, { onSuccess: () => setText('') })
  }

  // Enter makes a new line (messages are often several lines, and on a
  // phone Enter is the only way to get one); Ctrl+Enter — Cmd+Enter on a
  // Mac — sends, the usual shortcut for "submit this text area".
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) submit()
  }

  const label = send.isPending ? 'Sending…' : connected ? 'Send' : 'Connecting…'

  return (
    <form onSubmit={submit} className="space-y-1 border-t px-4 py-3">
      <div className="flex items-end gap-2">
        <Textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            // A new attempt: the old error no longer describes this text.
            if (send.isError) send.reset()
          }}
          onKeyDown={onKeyDown}
          // readOnly, not disabled, while sending: a disabled field loses
          // focus (and is skipped by screen readers); read-only keeps the
          // cursor where it was, so typing resumes right after.
          readOnly={send.isPending}
          aria-label="Message"
          placeholder="Write a message…"
          rows={2}
          className="max-h-40 min-h-10 flex-1 resize-none"
        />
        <Button type="submit" disabled={!canSend}>
          {label}
        </Button>
      </div>
      {left && (
        <p className={cn('text-xs', problem === 'too_long' ? 'text-destructive' : 'text-muted-foreground')}>
          {left}
        </p>
      )}
      {send.isError && (
        <p role="alert" className="text-sm text-destructive">
          {sendErrorText(send.error)}
        </p>
      )}
      {problem === 'too_long' && <p className="sr-only">{messageProblemText(problem)}</p>}
    </form>
  )
}

// A refusal: the server's own words — but a failure on the server's side
// (status 500) gets the app's shared sentence, as every REST answer does
// (failureText, api/apiErrors.ts): "Internal server error" helps nobody.
// Anything else (no answer in time, the connection dropped mid-way): a plain
// "try again" — the text is still in the box.
function sendErrorText(error: Error): string {
  if (error instanceof MessageRefusedError) {
    return error.status >= 500 ? SERVER_PROBLEM_TEXT : error.message
  }
  return "Couldn't send your message. Check your connection and try again."
}

// The conversation pane's padding, for the states that replace the whole
// conversation (not available, couldn't load).
function Pane({ children }: { children: ReactNode }) {
  return <div className="p-4">{children}</div>
}

function isHiddenConversation(error: unknown): boolean {
  return error instanceof ApiError && (error.statusCode === 404 || error.statusCode === 403)
}

function BackToMessages({ role }: { role: MessagingRole }) {
  return (
    <Link to={messagesPath(role)} className="block text-sm underline underline-offset-4">
      Back to messages
    </Link>
  )
}

// An <h2>: the pane sits beside the list, whose "Messages" is the page's
// <h1> (on a phone a visually hidden one stands in — MessagesLayout).
function ConversationNotAvailable({ role }: { role: MessagingRole }) {
  return (
    <NotAvailable
      title="Conversation not available"
      headingLevel={2}
      links={[{ to: messagesPath(role), label: 'Back to messages' }]}
    >
      This conversation doesn't exist, or you aren't part of it.
    </NotAvailable>
  )
}