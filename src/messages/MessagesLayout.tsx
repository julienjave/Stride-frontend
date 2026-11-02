import { Outlet, useMatch } from 'react-router'
import { cn } from '@/lib/utils'
import { ConversationList } from './ConversationList'
import { messagesPath } from './messagesPath'
import { useMessagingViewer } from './useMessagingViewer'

// The Messages section — a LAYOUT route with two children (routes.tsx): the
// index (no conversation open) and `:conversationId` (one open).
//
// Two panes on desktop (decided 2026-10-20), one at a time on a phone:
//
//   desktop (md+):  [ list │ open conversation, or "pick one" ]
//   phone:          the list            /messages
//                   the conversation    /messages/12   (with a back link)
//
// The SAME tree serves both; CSS decides what shows (like the two section
// navs of AuthenticatedLayout): on a phone the list hides when a
// conversation is open, and the right pane hides when none is. No width
// measured in JavaScript, nothing drawn twice.
//
// The URL is the single source of truth for "which conversation is open":
// useMatch reads it here (for the highlight and the CSS), the child reads
// it with useParams. Back/forward, a refresh and a shared link all just work.
export function MessagesLayout() {
  const viewer = useMessagingViewer()
  const match = useMatch(`${messagesPath(viewer?.role ?? 'patient')}/:conversationId`)
  if (!viewer) return null
  const selected = match ? Number(match.params.conversationId) : null
  const open = selected !== null

  return (
    // A fixed height (the window minus the top bar — and, on a phone, minus
    // the tab bar and its safe area: what <main>'s bottom padding reserves)
    // so each pane scrolls INSIDE itself: the list and the thread scroll
    // separately, and the composer stays at the bottom of the screen.
    // `dvh` (dynamic viewport height) follows a phone browser's address bar
    // as it shows and hides; `vh` would be the tallest size, and push the
    // composer under the bar.
    // The `1px`: the top bar's bottom border, outside its 4rem (`h-16` is
    // the bar's inner row) — without it the page scrolled by one pixel
    // (found 2026-11-03, decisions §47).
    <div className="mx-auto flex h-[calc(100dvh-8rem-1px-env(safe-area-inset-bottom))] max-w-6xl md:h-[calc(100dvh-4rem-1px)] md:border-x">
      <aside
        aria-label="Conversations"
        className={cn('w-full flex-col md:flex md:w-80 md:shrink-0 md:border-r', open ? 'hidden' : 'flex')}
      >
        <ConversationList role={viewer.role} myId={viewer.myId} selectedId={selected} />
      </aside>
      {/* min-w-0: a flex child is at least as wide as its content by
          default — a long unbroken word in a message would push the pane
          wider than the screen. */}
      <section className={cn('min-w-0 flex-1 flex-col md:flex', open ? 'flex' : 'hidden')}>
        {/* The page's heading on a PHONE with a conversation open: the
            list — and its visible <h1> "Messages" — is hidden there, and a
            screen-reader user moving by headings would find no level 1.
            sr-only: read, not seen (the person's name below is the visible
            title); md:hidden: gone from md up, where the list's own <h1> is
            on screen. One heading here covers every state of the pane
            (loading, the conversation, "Conversation not found"), and no
            heading has to change level with the screen's width. */}
        {open && <h1 className="sr-only md:hidden">Messages</h1>}
        <Outlet />
      </section>
    </div>
  )
}