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

import { MessageSquare } from 'lucide-react'
import { failureText } from '@/api/apiErrors'
import { Button } from '@/components/ui/button'
import type { MessagingRole } from './messagesPath'
import { personName, START_CONVERSATION_FAILED_TEXT } from './messageText'
import { useStartConversation } from './useStartConversation'

interface MessageButtonProps {
  // MY role — where the conversation opens (/practitioner/messages/… or
  // /patient/messages/…).
  role: MessagingRole
  // The person to write to.
  person: { id: number; firstName: string; lastName: string }
}

// "Message" on a profile (the patient's My Team profile, the practitioner's
// patient page): opens the conversation with this person — starting it if
// needed (the backend's "start or get"), so the button never has to know
// whether one exists.
export function MessageButton({ role, person }: MessageButtonProps) {
  const start = useStartConversation(role)
  return (
    <div className="space-y-1">
      <Button
        variant="outline"
        size="sm"
        onClick={() => start.mutate(person.id)}
        disabled={start.isPending}
        // The visible word is short ("Message"); the accessible name says
        // who, so it stays clear out of context (a screen reader's list of
        // buttons).
        aria-label={`Message ${personName(person)}`}
      >
        <MessageSquare aria-hidden="true" />
        Message
      </Button>
      {start.isError && (
        <p role="alert" className="text-sm text-destructive">
          {failureText(start.error, START_CONVERSATION_FAILED_TEXT)}
        </p>
      )}
    </div>
  )
}