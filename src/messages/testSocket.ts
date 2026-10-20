import { act } from '@testing-library/react'
import type { ClientEvent, MessagingSocket } from './messagingSocket'
import type { ServerEvents, SocketAnswer } from './types'

type Listener = (payload: never) => void

// A stand-in for the live connection, driven by the test: it implements
// MessagingSocket (the adapter's four methods) and adds the knobs a test
// needs — connect it, push a server event, answer a send.
//
// Every push goes through act(): it changes React state (the cache, the
// `connected` flag), and act() makes React finish re-rendering before the
// test looks at the screen.
export class FakeSocket implements MessagingSocket {
  private readonly listeners = new Map<string, Listener[]>()
  private readonly connectionListeners: ((connected: boolean) => void)[] = []
  // Every `send`, in order, with the means to answer it later — so a test
  // can look at the screen WHILE a message is on its way ("Sending…").
  readonly sent: {
    event: ClientEvent
    data: object
    answer: (answer: SocketAnswer<unknown>) => void
    fail: (error: Error) => void
  }[] = []
  closed = false

  onServerEvent<E extends keyof ServerEvents>(event: E, listener: (payload: ServerEvents[E]) => void) {
    const list = this.listeners.get(event) ?? []
    list.push(listener)
    this.listeners.set(event, list)
  }

  onConnectionChange(listener: (connected: boolean) => void) {
    this.connectionListeners.push(listener)
  }

  send<T>(event: ClientEvent, data: object): Promise<SocketAnswer<T>> {
    return new Promise((resolve, reject) => {
      this.sent.push({
        event,
        data,
        answer: (answer) => resolve(answer as SocketAnswer<T>),
        fail: reject,
      })
    })
  }

  close() {
    this.closed = true
  }

  // --- The test's side -------------------------------------------------

  setConnected(connected: boolean) {
    act(() => {
      for (const listener of this.connectionListeners) listener(connected)
    })
  }

  push<E extends keyof ServerEvents>(event: E, payload: ServerEvents[E]) {
    act(() => {
      for (const listener of this.listeners.get(event) ?? []) (listener as (p: ServerEvents[E]) => void)(payload)
    })
  }

  // The latest send's answer, inside act() (the mutation then settles and
  // the composer re-renders).
  async answerLast(answer: SocketAnswer<unknown>) {
    const last = this.sent.at(-1)
    if (!last) throw new Error('Nothing was sent')
    await act(async () => {
      last.answer(answer)
      await Promise.resolve()
    })
  }
}