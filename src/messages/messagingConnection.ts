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

import { createContext, useContext } from 'react'
import type { ClientEvent } from './messagingSocket'
import type { SocketAnswer } from './types'

// What a component may do with the live connection: know whether it is up
// (to say "Connecting…" instead of offering Send), and send an event with an
// acknowledgement. The socket itself stays inside the provider — no
// component can add a listener it forgets to remove, or close the shared
// connection.
export interface MessagingConnection {
  connected: boolean
  send<T>(event: ClientEvent, data: object): Promise<SocketAnswer<T>>
}

// null outside the provider (an admin's pages, the login page).
export const MessagingConnectionContext = createContext<MessagingConnection | null>(null)

// In its own file, not beside the provider component: React's fast refresh
// (in development) can only hot-swap a file that exports components alone.
export function useMessagingConnection(): MessagingConnection {
  const connection = useContext(MessagingConnectionContext)
  if (!connection) {
    // A programming error, not a user's: only practitioners' and patients'
    // pages are rendered inside the provider (AuthenticatedLayout).
    throw new Error('useMessagingConnection must be used inside MessagingConnectionProvider')
  }
  return connection
}