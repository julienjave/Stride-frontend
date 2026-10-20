import { useState } from 'react'
import { Link } from 'react-router'
import { ShowHiddenToggle } from '@/common/ShowHiddenToggle'
import { UserAvatar } from '@/common/UserAvatar'
import { cn } from '@/lib/utils'
import { conversationPath, type MessagingRole } from './messagesPath'
import { splitArchived } from './messageRules'
import { listTimeText, personName, previewText, READ_ONLY_SHORT_TEXT } from './messageText'
import { NewMessageDialog } from './NewMessageDialog'
import type { ConversationSummary } from './types'
import { useConversations } from './useConversations'

interface ConversationListProps {
  role: MessagingRole
  myId: number
  // The open conversation (desktop: highlighted beside it), or null.
  selectedId: number | null
}

// The Messages list: newest activity first (the server's order, kept by the
// live updates), archived ones behind "Show N archived" — the
// ShowHiddenToggle pattern of past programs and past care-team members.
export function ConversationList({ role, myId, selectedId }: ConversationListProps) {
  const conversations = useConversations()
  const [showArchived, setShowArchived] = useState(false)
  // "Now", for the rows' times ("14:05" today, "Mon" this week…), read ONCE
  // when the list opens — the app's rule for "today" (a page left open past
  // midnight keeps describing the day it opened on), and a render stays a
  // pure function of its inputs: calling new Date() during render would
  // give a different answer on every re-render.
  const [now] = useState(() => new Date())

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h1 className="text-xl font-semibold">Messages</h1>
        <NewMessageDialog role={role} />
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.isPending && <p className="p-4 text-sm text-muted-foreground">Loading conversations…</p>}
        {conversations.isError && (
          <p role="alert" className="p-4 text-sm text-destructive">
            Couldn't load your conversations. Try refreshing the page.
          </p>
        )}
        {conversations.isSuccess && (
          <Lists
            conversations={conversations.data}
            role={role}
            myId={myId}
            selectedId={selectedId}
            showArchived={showArchived}
            onShowArchived={setShowArchived}
            now={now}
          />
        )}
      </div>
    </div>
  )
}

function Lists({
  conversations,
  role,
  myId,
  selectedId,
  showArchived,
  onShowArchived,
  now,
}: {
  conversations: ConversationSummary[]
  role: MessagingRole
  myId: number
  selectedId: number | null
  showArchived: boolean
  onShowArchived: (show: boolean) => void
  now: Date
}) {
  const { inbox, archived } = splitArchived(conversations)
  const row = (summary: ConversationSummary) => (
    <ConversationRow
      key={summary.id}
      summary={summary}
      href={conversationPath(role, summary.id)}
      myId={myId}
      selected={summary.id === selectedId}
      now={now}
    />
  )

  return (
    <>
      {conversations.length === 0 && (
        <p className="p-4 text-sm text-muted-foreground">
          No messages yet. Start a conversation with New message.
        </p>
      )}
      {conversations.length > 0 && inbox.length === 0 && (
        <p className="p-4 text-sm text-muted-foreground">Every conversation is archived.</p>
      )}
      {inbox.length > 0 && (
        <ul aria-label="Inbox" className="divide-y">
          {inbox.map(row)}
        </ul>
      )}
      {archived.length > 0 && (
        <div className="space-y-2 border-t p-4">
          <ShowHiddenToggle
            count={archived.length}
            singular="archived conversation"
            plural="archived conversations"
            checked={showArchived}
            onChange={onShowArchived}
          />
        </div>
      )}
      {showArchived && archived.length > 0 && (
        <ul aria-label="Archived conversations" className="divide-y border-t">
          {archived.map(row)}
        </ul>
      )}
    </>
  )
}

// One row, the whole row a link. A screen reader reads the row's text as
// the link's name — name, time, preview, unread count — which is what a
// messages list should say (unlike a profile card, where a stretched link
// keeps the name short: here every part is the point).
function ConversationRow({
  summary,
  href,
  myId,
  selected,
  now,
}: {
  summary: ConversationSummary
  href: string
  myId: number
  selected: boolean
  now: Date
}) {
  const { otherParticipant: other, lastMessage, unreadCount } = summary
  const unread = unreadCount > 0
  return (
    <li>
      <Link
        to={href}
        // aria-current="page": the conversation open beside the list
        // (desktop) — announced as "current page", and styled below.
        aria-current={selected ? 'page' : undefined}
        className={cn(
          'flex items-center gap-3 px-4 py-3 hover:bg-muted/60 focus-visible:outline-2 focus-visible:-outline-offset-2',
          selected && 'bg-muted',
        )}
      >
        <UserAvatar
          firstName={other.firstName}
          lastName={other.lastName}
          avatarUrl={other.avatarUrl}
          className="size-10 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className={cn('truncate', unread ? 'font-semibold' : 'font-medium')}>{personName(other)}</span>
            {lastMessage && (
              <time dateTime={lastMessage.sentAt} className="shrink-0 text-xs text-muted-foreground">
                {listTimeText(lastMessage.sentAt, now)}
              </time>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            {/* `truncate` = one line, cut with "…": the preview never makes
                a row taller. */}
            <span className={cn('truncate text-sm', unread ? 'text-foreground' : 'text-muted-foreground')}>
              {previewText(summary, myId)}
            </span>
            {unread && (
              <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                {/* The number for the eye, the words for a screen reader
                    ("3" alone would be read as just "three"). */}
                <span aria-hidden="true">{unreadCount}</span>
                <span className="sr-only">{unreadCount} unread</span>
              </span>
            )}
          </div>
          {!summary.canSend && <span className="text-xs text-muted-foreground">{READ_ONLY_SHORT_TEXT}</span>}
        </div>
      </Link>
    </li>
  )
}