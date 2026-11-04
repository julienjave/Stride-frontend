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

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import * as Sentry from '@sentry/react'
import { browserReportingOptions, startSdk } from './sentry'

// The REAL SDK, with its real fetch transport — only `fetch` itself is
// replaced, so the test reads exactly what the browser would send to the
// tunnel: the address, the request's options, the envelope.

const CONFIG = {
  dsn: 'http://abc123@glitchtip.test/2',
  tunnel: 'http://api.test/monitoring',
  environment: 'test',
  release: 'r1',
}

interface Sent {
  url: string
  init: RequestInit
}

// ONE stub for the whole file, emptied before each test: the SDK keeps the
// `fetch` it finds on first use (its getNativeImplementation cache), so a
// stub swapped in by a later test would never be called.
const sent: Sent[] = []

beforeAll(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init: RequestInit) => {
      sent.push({ url, init })
      return Promise.resolve(new Response('{}', { status: 200 }))
    }),
  )
})

beforeEach(() => {
  sent.length = 0
})

afterAll(() => {
  vi.unstubAllGlobals()
})

// An envelope: a header line, then for each item a header line and its payload.
// The SDK sends it as one string (the browser then labels it text/plain —
// what the tunnel accepts).
function envelopeOf(sent: Sent) {
  const text = sent.init.body
  if (typeof text !== 'string') throw new Error('The envelope should be sent as text')
  const [header, , payload] = text.split('\n')
  return {
    header: JSON.parse(header) as { dsn?: string },
    event: JSON.parse(payload) as Sentry.ErrorEvent,
    text,
  }
}

afterEach(async () => {
  await Sentry.close()
})

describe('startSdk', () => {
  it('sends to the tunnel, with the session cookie, an envelope for our project', async () => {
    const capture = startSdk(CONFIG)
    capture(new Error('the page broke'), { where: 'route-error' })
    await Sentry.flush(2_000)

    expect(sent).toHaveLength(1)
    expect(sent[0].url).toBe('http://api.test/monitoring')
    expect(sent[0].init.method).toBe('POST')
    // The tunnel reads the account from the session: the cookie must go.
    expect(sent[0].init.credentials).toBe('include')
    // The tunnel accepts only our frontend project's DSN.
    expect(envelopeOf(sent[0]).header.dsn).toBe(CONFIG.dsn)
  })

  it('sends the error and its tags, and nothing that names or locates a patient', async () => {
    // What a careless page could leave around an error: a user set on the
    // SDK, a breadcrumb, extra data, an email in the message itself.
    Sentry.setUser({ id: '7', email: 'jane@example.com' })
    const capture = startSdk(CONFIG)
    Sentry.setUser({ id: '7', email: 'jane@example.com', username: 'Jane Doe' })
    Sentry.addBreadcrumb({ category: 'ui.click', message: "button 'Open Jane Doe'" })
    Sentry.setExtra('form', { note: 'knee still hurts' })
    capture(new Error('No account for jane@example.com', { cause: new Error('lookup failed') }), {
      where: 'route-error',
      route: '/patients/7',
      reference: '7f3a1c2e',
    })
    await Sentry.flush(2_000)

    const { event, text } = envelopeOf(sent[0])
    expect(event.tags).toStrictEqual({
      where: 'route-error',
      route: '/patients/7',
      reference: '7f3a1c2e',
    })
    // Sentry lists the cause first, then the error itself (linkedErrors).
    expect(event.exception?.values?.map((value) => value.value)).toStrictEqual([
      'lookup failed',
      'No account for [email]',
    ])
    expect(event.environment).toBe('test')
    expect(event.release).toBe('r1')
    expect(event).not.toHaveProperty('user')
    expect(event).not.toHaveProperty('request')
    expect(event).not.toHaveProperty('breadcrumbs')
    expect(event).not.toHaveProperty('extra')
    expect(text).not.toMatch(/jane|knee|"vars"/i)
  })
})

describe('the same crash twice', () => {
  // Each crash page shows its own reference, so each crash must arrive —
  // even one exactly like the last (no Dedupe).
  it('sends both, each with its reference', async () => {
    const capture = startSdk(CONFIG)
    // Made on the SAME line both times: equal type, message AND stack —
    // exactly what Dedupe would drop as a repeat.
    for (const reference of ['11111111', '22222222']) {
      capture(new TypeError("Cannot read properties of undefined (reading 'id')"), {
        where: 'route-error',
        reference,
      })
    }
    await Sentry.flush(2_000)
    // Both, in any order.
    expect(sent.map((one) => envelopeOf(one).event.tags?.reference).sort()).toStrictEqual([
      '11111111',
      '22222222',
    ])
  })
})

describe('browserReportingOptions', () => {
  // The integrations the SDK runs: chosen, not its defaults — no
  // breadcrumbs, no global handlers (ours catch errors before the SDK
  // arrives), no page address, no sessions, no replay, no tracing.
  it('runs only the chosen integrations, and keeps no breadcrumbs', () => {
    const options = browserReportingOptions(CONFIG)
    expect(options.defaultIntegrations).toBe(false)
    const integrations = options.integrations as { name: string }[]
    expect(integrations.map((integration) => integration.name)).toStrictEqual([
      'EventFilters',
      'FunctionToString',
      'LinkedErrors',
    ])
    expect(options.maxBreadcrumbs).toBe(0)
    expect(options.sendClientReports).toBe(false)
  })

  it('collects none of the data v11 would collect by default', () => {
    expect(browserReportingOptions(CONFIG).dataCollection).toStrictEqual({
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
    })
  })
})