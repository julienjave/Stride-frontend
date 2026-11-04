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

import type { SocketAnswer } from './types'

// The server refused what we sent over the socket: its status and its own
// words (a blank message, a read-only conversation, a message already read
// or too old to delete…). Thrown by the send and delete mutations so the
// screens can show `message` as it is.
// (The field is declared, then set: the project's `erasableSyntaxOnly`
// forbids the `constructor(readonly status: number)` shorthand — TypeScript
// syntax that would have to generate JavaScript, rather than just be erased.)
export class MessageRefusedError extends Error {
  readonly status: number
  // Only on a 500: its reference (api/apiErrors.ts, serverProblemText).
  readonly requestId?: string

  constructor(status: number, message: string, requestId?: string) {
    super(message)
    this.name = 'MessageRefusedError'
    this.status = status
    this.requestId = requestId
  }
}

// An acknowledgement → its data, or the refusal thrown. Every event the
// client sends answers in the same shape (the backend's WsHttpExceptionFilter),
// so every mutation that sends one unwraps it the same way.
export function dataOrThrow<T>(answer: SocketAnswer<T>): T {
  if (!answer.ok) {
    throw new MessageRefusedError(answer.status, answer.message.join(' '), answer.requestId)
  }
  return answer.data
}