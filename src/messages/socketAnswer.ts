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

  constructor(status: number, message: string) {
    super(message)
    this.name = 'MessageRefusedError'
    this.status = status
  }
}

// An acknowledgement → its data, or the refusal thrown. Every event the
// client sends answers in the same shape (the backend's WsHttpExceptionFilter),
// so every mutation that sends one unwraps it the same way.
export function dataOrThrow<T>(answer: SocketAnswer<T>): T {
  if (!answer.ok) throw new MessageRefusedError(answer.status, answer.message.join(' '))
  return answer.data
}