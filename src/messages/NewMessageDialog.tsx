import { useState } from 'react'
import { SquarePen } from 'lucide-react'
import { UserAvatar } from '@/common/UserAvatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { filterCandidates } from '@/patients/patientPageRules'
import type { MessagingRole } from './messagesPath'
import { personName } from './messageText'
import { LoadError } from '@/common/LoadError'
import { useRetryFocus } from '@/common/useRetryFocus'
import { useRecipients } from './recipients'
import { useStartConversation } from './useStartConversation'

// New message: pick who to write to, and the conversation opens (an
// existing one if there is one — the backend's "start or get"). Only people
// I'm on a CURRENT care team with are offered: the backend would refuse
// anyone else.
//
// Each person is a BUTTON, not a radio + "Start" button as in "Add a
// colleague": picking someone is the whole decision here (nothing else to
// fill in), so one click does it — and a button is what a screen reader
// expects for "do this now".
export function NewMessageDialog({ role }: { role: MessagingRole }) {
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState('')
  // Fetched only while the dialog is open.
  const { recipients, isError, query } = useRecipients(role, isOpen)
  const start = useStartConversation(role)

  // Escape, a click outside, and success all go through here: the dialog
  // always reopens empty, with no old error.
  function changeOpen(open: boolean) {
    setIsOpen(open)
    if (!open) {
      setFilter('')
      start.reset()
    }
  }

  function pick(userId: number) {
    // `mutate`'s own onSuccess (on top of the hook's, which caches and
    // navigates): close the dialog once the conversation is open.
    start.mutate(userId, { onSuccess: () => changeOpen(false) })
  }

  const visible = recipients ? filterCandidates(recipients, filter) : []
  const who = role === 'practitioner' ? 'patients' : 'care team'
  // The load error's words: "Couldn't load your patients."
  const what = `your ${who}`
  // After a "Try again" of the list that worked, focus goes to the dialog's
  // title (the list has no heading; focus stays inside the dialog).
  const title = useRetryFocus<HTMLHeadingElement>(what, query.isSuccess)

  return (
    <Dialog open={isOpen} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <SquarePen aria-hidden="true" />
          New message
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle ref={title} tabIndex={-1} className="outline-none">
            New message
          </DialogTitle>
          <DialogDescription>
            {role === 'practitioner'
              ? 'Write to one of your patients.'
              : 'Write to someone on your care team.'}
          </DialogDescription>
        </DialogHeader>

        <Input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={role === 'practitioner' ? 'Filter by name…' : 'Filter by name or specialty…'}
          aria-label={role === 'practitioner' ? 'Filter by name' : 'Filter by name or specialty'}
        />

        {isError && <LoadError what={what} queries={[query]} />}
        {!isError && !recipients && <p className="text-sm text-muted-foreground">Loading…</p>}
        {recipients && recipients.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {role === 'practitioner'
              ? "You aren't on any patient's care team yet."
              : 'Nobody is on your care team at the moment.'}
          </p>
        )}
        {recipients && recipients.length > 0 && visible.length === 0 && (
          <p className="text-sm text-muted-foreground">Nobody matches "{filter.trim()}".</p>
        )}
        {visible.length > 0 && (
          <ul aria-label={`Your ${who}`} className="max-h-72 divide-y overflow-y-auto rounded-lg border">
            {visible.map((recipient) => (
              <li key={recipient.id}>
                <button
                  type="button"
                  onClick={() => pick(recipient.id)}
                  // One request at a time: a second click while the first
                  // is on its way would open two conversations in a row.
                  disabled={start.isPending}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 disabled:opacity-60"
                >
                  <UserAvatar
                    firstName={recipient.firstName}
                    lastName={recipient.lastName}
                    avatarUrl={recipient.avatarUrl}
                    className="size-8 text-xs"
                  />
                  <span className="min-w-0">
                    <span className="block font-medium">{personName(recipient)}</span>
                    {recipient.specialties.length > 0 && (
                      <span className="block text-xs text-muted-foreground">
                        {recipient.specialties.join(', ')}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {start.isError && (
          <p role="alert" className="text-sm text-destructive">
            {start.error.message}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}