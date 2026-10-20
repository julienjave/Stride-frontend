import { useNavigate } from 'react-router'
import { Archive, ArchiveRestore } from 'lucide-react'
import { ApiError } from '@/api/client'
import { Button } from '@/components/ui/button'
import { messagesPath, type MessagingRole } from './messagesPath'
import type { ConversationSummary } from './types'
import { useArchiveConversation } from './useArchiveConversation'

// Archive / Unarchive, in the conversation's header (decided 2026-10-20:
// one place for the action, the same on a phone and on desktop — not a
// menu on every list row, which is already one big link).
//
// Archiving means "done with this for now": the view goes back to the
// list, where the row now waits under "Show N archived". Unarchiving
// happens from inside an archived conversation, so it stays open.
//
// `replace`: the conversation's history entry is SWAPPED for the list, so
// Back from the list doesn't reopen what was just put away (the
// ArchiveTemplateButton pattern).
//
// No confirmation: archiving loses nothing and is undone in two taps — and
// a new message brings the conversation back by itself (decided
// 2026-10-20).
export function ArchiveConversationButton({ summary, role }: { summary: ConversationSummary; role: MessagingRole }) {
  const archive = useArchiveConversation(summary.id)
  const navigate = useNavigate()
  const archived = summary.archivedAt !== null
  const Icon = archived ? ArchiveRestore : Archive
  const word = archived ? 'Unarchive' : 'Archive'

  function onClick() {
    archive.mutate(!archived, {
      onSuccess: (updated) => {
        if (updated.archivedAt !== null) void navigate(messagesPath(role), { replace: true })
      },
    })
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClick}
        disabled={archive.isPending}
        // The visible word is hidden on a phone (the icon alone keeps the
        // header from crowding the name), so the name is set here — and
        // starts with the visible word, as a voice-control user would say
        // it ("click Archive").
        aria-label={`${word} conversation`}
        title={`${word} conversation`}
        className="ml-auto shrink-0"
      >
        <Icon aria-hidden="true" className="size-4" />
        <span className="hidden sm:inline">{word}</span>
      </Button>
      {archive.isError && (
        <p role="alert" className="basis-full text-sm text-destructive">
          {archive.error instanceof ApiError
            ? archive.error.messages.join(' ')
            : `Couldn't ${word.toLowerCase()} this conversation. Try again.`}
        </p>
      )}
    </>
  )
}