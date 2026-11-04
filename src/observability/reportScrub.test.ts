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

import { describe, expect, it } from 'vitest'
import type { ErrorEvent } from '@sentry/react'
import { pathOnly, scrubBrowserEvent } from './reportScrub'

// The browser's lock on a report (the tunnel applies the backend's again).
// One event with something planted in every part a report can have — what
// comes out is compared WHOLE, so a part that slips through fails the test.

describe('scrubBrowserEvent', () => {
  it('keeps only the allowed fields, without their values', () => {
    const event = {
      type: undefined,
      event_id: 'e1',
      timestamp: 1,
      platform: 'javascript',
      level: 'error',
      release: 'r1',
      environment: 'production',
      sdk: { name: 'sentry.javascript.react', version: '11.7.0', integrations: ['x'] },
      message: 'Saved for jane@example.com',
      exception: {
        values: [
          {
            type: 'TypeError',
            value: "Cannot read 'x' of jane@example.com",
            module: 'm',
            mechanism: { type: 'onerror', handled: false, data: { note: 'Jane' } },
            stacktrace: {
              frames: [
                {
                  filename: 'http://app.test/assets/index.js?v=1#x',
                  abs_path: 'http://app.test/assets/index.js?token=t',
                  function: 'render',
                  lineno: 3,
                  colno: 9,
                  in_app: true,
                  vars: { patient: 'Jane Doe' },
                },
              ],
            },
          },
        ],
      },
      tags: {
        where: 'route-error',
        route: '/patients/7?search=Jane',
        reference: '7f3a1c2e',
        patient: 'Jane',
      },
      user: { id: '7', email: 'jane@example.com', ip_address: '203.0.113.7' },
      request: { url: 'http://app.test/patients?search=Jane', headers: { Referer: 'x' } },
      breadcrumbs: [{ category: 'ui.click', message: "button 'Open Jane Doe'" }],
      extra: { form: { note: 'knee still hurts' } },
      contexts: { browser: { name: 'Chrome' }, state: { patient: 'Jane' } },
    } as unknown as ErrorEvent

    expect(scrubBrowserEvent(event)).toStrictEqual({
      event_id: 'e1',
      timestamp: 1,
      platform: 'javascript',
      level: 'error',
      release: 'r1',
      environment: 'production',
      sdk: { name: 'sentry.javascript.react', version: '11.7.0' },
      message: 'Saved for [email]',
      exception: {
        values: [
          {
            type: 'TypeError',
            value: "Cannot read 'x' of [email]",
            mechanism: { type: 'onerror', handled: false },
            stacktrace: {
              frames: [
                {
                  filename: 'http://app.test/assets/index.js',
                  abs_path: 'http://app.test/assets/index.js',
                  function: 'render',
                  lineno: 3,
                  colno: 9,
                  in_app: true,
                },
              ],
            },
          },
        ],
      },
      tags: { where: 'route-error', route: '/patients/7', reference: '7f3a1c2e' },
    })
  })

  it('leaves out the sections an event does not have', () => {
    expect(
      scrubBrowserEvent({ event_id: 'e2', tags: { other: 'x' } } as unknown as ErrorEvent),
    ).toStrictEqual({ event_id: 'e2' })
  })

  it('keeps no tag that is not text', () => {
    expect(
      scrubBrowserEvent({ tags: { where: 3, route: '/x' } } as unknown as ErrorEvent).tags,
    ).toStrictEqual({ route: '/x' })
  })

  it('cuts long texts to 1,000 characters', () => {
    const scrubbed = scrubBrowserEvent({ message: 'a'.repeat(1_500) } as unknown as ErrorEvent)
    expect(scrubbed.message).toHaveLength(1_000)
  })
})

describe('pathOnly', () => {
  it('cuts an address at its query or its fragment', () => {
    expect(pathOnly('/patients?search=Jane')).toBe('/patients')
    expect(pathOnly('/patients#top')).toBe('/patients')
    expect(pathOnly('/patients')).toBe('/patients')
  })
})