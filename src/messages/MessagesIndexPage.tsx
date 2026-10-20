import { MessageSquare } from 'lucide-react'

// The right-hand pane when no conversation is open — desktop only (on a
// phone the layout hides this pane and shows the list).
export function MessagesIndexPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
      <MessageSquare aria-hidden="true" className="size-10" />
      <p className="text-sm">Choose a conversation, or start one with New message.</p>
    </div>
  )
}