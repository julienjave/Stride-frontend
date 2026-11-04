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