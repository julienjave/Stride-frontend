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

import { Link } from 'react-router'
import { Mail } from 'lucide-react'
import { unreadCountText } from './messageText'
import { useUnreadMessageCount } from './useConversations'

// The practitioner home card's "Messages" slot, replacing its "Coming soon"
// (Phase 5): how many messages are waiting, as a link to the list. Same look
// as the card's other slots (ForReviewSlot, TodaySlot): icon, small label,
// value.
//
// The conversation list's own query — the one the Messages tab badge and
// the list page read — so one request feeds all three, and the live
// connection keeps the number current without asking again.
export function MessagesSlot() {
  const unread = useUnreadMessageCount()
  return (
    <div className="flex flex-col items-center gap-1">
      <Mail className="h-5 w-5" aria-hidden="true" />
      <span className="text-xs uppercase text-muted-foreground">Messages</span>
      {unread.isSuccess && (
        <Link to="/practitioner/messages" className="text-sm font-medium underline-offset-4 hover:underline">
          {unreadCountText(unread.data)}
        </Link>
      )}
      {unread.isError && <span className="text-sm text-muted-foreground">Unavailable</span>}
    </div>
  )
}