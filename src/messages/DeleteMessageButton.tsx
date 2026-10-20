import { useRef, useState, type RefObject } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { DELETE_DESCRIPTION, DELETE_TITLE, deleteMessageLabel } from './messageText'
import { useMessagingConnection } from './messagingConnection'
import { MessageRefusedError } from './socketAnswer'
import type { Message } from './types'
import { useBeforeDeadline } from './useBeforeDeadline'
import { useDeleteMessage } from './useDeleteMessage'

interface DeleteMessageButtonProps {
  conversationId: number
  message: Message
  // The last moment it can be deleted (deletableUntil), or null.
  deadline: number | null
  // Where focus goes once the message is deleted: the button is gone by
  // then (a deleted message can't be deleted), and focus left on nothing
  // falls back to the top of the page — a keyboard user would have to Tab
  // all the way back. The bubble, now saying "Message deleted", is where
  // they were, and what a screen reader then reads.
  focusAfterDelete: RefObject<HTMLElement | null>
}

// The trash button under one of MY messages, shown only while deleting it
// would succeed — unread, at most 15 minutes old — and gone the moment
// either stops being true: the `conversationRead` event sets readAt (the
// deadline becomes null), and useBeforeDeadline's timer fires when the
// minutes run out. (Decided 2026-10-20: a visible icon button — found
// without a long-press, reached with Tab — rather than a "⋮" menu, and a
// small confirmation, since a deletion can't be undone.)
export function DeleteMessageButton({ conversationId, message, deadline, focusAfterDelete }: DeleteMessageButtonProps) {
  const deletable = useBeforeDeadline(deadline)
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const { connected } = useMessagingConnection()
  const remove = useDeleteMessage(conversationId)

  // The dialog outlives the button: if the window closes WHILE someone is
  // confirming (read meanwhile, or the minutes ran out), the button goes
  // but the dialog stays, so it doesn't vanish under their finger. Pressing
  // Delete then gets the server's answer — and the server is the right
  // judge of "too late": its clock decides, not this device's.
  if (!deletable && !open) return null

  function onOpenChange(next: boolean) {
    setOpen(next)
    // Closed after a refusal: reopening starts clean, not with an old error.
    if (!next) remove.reset()
  }

  const label = remove.isPending ? 'Deleting…' : connected ? 'Delete' : 'Connecting…'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {deletable && (
        <DialogTrigger asChild>
          <Button
            ref={trigger}
            type="button"
            variant="ghost"
            size="icon"
            aria-label={deleteMessageLabel(message.sentAt)}
            // A tooltip for the mouse: the icon's meaning, in words.
            title="Delete"
            // -my-1: a 28px target (big enough for a finger) inside a line
            // of 16px text, without making the line taller.
            className="-my-1 size-7 text-muted-foreground hover:text-destructive"
          >
            <Trash2 aria-hidden="true" className="size-3.5" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent
        onCloseAutoFocus={(event) => {
          // Radix returns focus to the button that opened the dialog —
          // unless the button is gone (deleted, or the window closed).
          // `trigger.current` is null once React has removed it.
          if (!trigger.current) {
            event.preventDefault()
            focusAfterDelete.current?.focus()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{DELETE_TITLE}</DialogTitle>
          <DialogDescription>{DELETE_DESCRIPTION}</DialogDescription>
        </DialogHeader>
        {/* Which message: on a phone the dialog covers the thread. Three
            lines at most — enough to recognise it. */}
        <p className="line-clamp-3 whitespace-pre-wrap wrap-break-word rounded-md bg-muted px-3 py-2 text-sm">
          {message.messageBody}
        </p>
        {remove.isError && (
          <p role="alert" className="text-sm text-destructive">
            {deleteErrorText(remove.error)}
          </p>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={remove.isPending}>
              Cancel
            </Button>
          </DialogClose>
          {/* Not a DialogClose (ArchiveTemplateButton's reasoning): the
              dialog stays open on a refusal, so the reason stays visible,
              and closes only once the server has deleted the message. */}
          <Button
            variant="destructive"
            disabled={remove.isPending || !connected}
            onClick={() => remove.mutate(message.id, { onSuccess: () => setOpen(false) })}
          >
            {label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// A refusal (409: read meanwhile, or too late): the server's own words.
// Anything else (no answer in time, the connection dropped): try again.
function deleteErrorText(error: Error): string {
  if (error instanceof MessageRefusedError) return error.message
  return "Couldn't delete your message. Check your connection and try again."
}