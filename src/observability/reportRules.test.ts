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
import { ApiError } from '@/api/client'
import { MessageRefusedError } from '@/messages/socketAnswer'
import { isChunkLoadError, newReference, shouldReport } from './reportRules'

function apiError(statusCode: number): ApiError {
  return new ApiError({
    statusCode,
    message: ['Internal server error'],
    error: 'Error',
    timestamp: '2031-01-01T00:00:00.000Z',
    path: '/x',
    requestId: '7f3a1c2e-9b4d-4e1f-8a2b-3c4d5e6f7a8b',
  })
}

describe('shouldReport', () => {
  it("reports the frontend's own bugs", () => {
    expect(shouldReport(new TypeError("Cannot read properties of undefined (reading 'id')"))).toBe(
      true,
    )
    expect(shouldReport(new Error('something else'))).toBe(true)
    // A rejection with a value that isn't an Error is still a bug.
    expect(shouldReport('a string')).toBe(true)
  })

  // The backend reports its own 5xx, with the same reference.
  it("doesn't report the server's answers", () => {
    expect(shouldReport(apiError(500))).toBe(false)
    expect(shouldReport(apiError(409))).toBe(false)
    expect(shouldReport(new MessageRefusedError(500, 'Internal server error', 'x'))).toBe(false)
  })

  it("doesn't report a page file that couldn't be downloaded, in any browser's words", () => {
    for (const message of [
      'Failed to fetch dynamically imported module: http://app.test/assets/Page-1.js',
      'error loading dynamically imported module: http://app.test/assets/Page-1.js',
      'Importing a module script failed.',
      'Unable to preload CSS for /assets/Page-1.css',
    ]) {
      expect(shouldReport(new TypeError(message))).toBe(false)
    }
  })

  it("doesn't report a request that got no answer, or was cancelled", () => {
    expect(shouldReport(new TypeError('Failed to fetch'))).toBe(false)
    expect(shouldReport(new TypeError('NetworkError when attempting to fetch resource.'))).toBe(
      false,
    )
    expect(shouldReport(new TypeError('Load failed'))).toBe(false)
    expect(shouldReport(new DOMException('The user aborted a request.', 'AbortError'))).toBe(false)
    expect(shouldReport(new DOMException('Timed out', 'TimeoutError'))).toBe(false)
    // Another DOMException is a bug like any other.
    expect(shouldReport(new DOMException('Bad selector', 'SyntaxError'))).toBe(true)
  })

  // Only the browsers' exact network sentences: a bug whose message merely
  // CONTAINS the words is still reported.
  it('reports an error that only mentions a failed fetch', () => {
    expect(shouldReport(new TypeError('Failed to fetch the program: x is undefined'))).toBe(true)
  })
})

describe('isChunkLoadError', () => {
  it('is only about Errors', () => {
    expect(isChunkLoadError('Failed to fetch dynamically imported module')).toBe(false)
    expect(isChunkLoadError({ message: 'Failed to fetch dynamically imported module' })).toBe(
      false,
    )
    expect(isChunkLoadError(new Error('Failed to fetch dynamically imported module'))).toBe(true)
  })
})

describe('newReference', () => {
  // The shape the backend's tunnel keeps (report-scrub.ts): 8 hex characters.
  it('is 8 lowercase hex characters, different each time', () => {
    const first = newReference()
    expect(first).toMatch(/^[0-9a-f]{8}$/)
    expect(newReference()).not.toBe(first)
  })
})