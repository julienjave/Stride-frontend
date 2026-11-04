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

import { ApiError } from '@/api/client'
import { shortReference } from '@/api/apiErrors'
import { MessageRefusedError } from '@/messages/socketAnswer'

// WHICH errors the browser reports (decisions §32, pass 3 — the person's
// choice: the frontend's own bugs only). A report is for something that
// should never happen — a page crashing while it renders, an error nobody
// caught. Not reported:
//
// - The server's answers (an ApiError, a socket refusal). A 4xx is an
//   answer the app shows in words. A 5xx is the backend's own bug, and the
//   BACKEND reports it, with the same request id the screen shows as its
//   reference — a second report from the browser would only double it. And
//   a proxy's 502 means the backend is down: the tunnel with it, so the
//   report couldn't be delivered anyway (the uptime monitor watches that).
// - A page file that couldn't be downloaded: the connection, or a new
//   version deployed (app/staleChunkReload.ts reloads onto it). Each browser
//   words it its own way.
// - No answer at all: the network dropped, a request was cancelled. The
//   user's side, not a bug.
const CHUNK_LOAD_FAILURES = [
  'Failed to fetch dynamically imported module', // Chromium
  'error loading dynamically imported module', // Firefox
  'Importing a module script failed', // Safari
  'Unable to preload CSS', // Vite's own, for a page's stylesheet
]

const NETWORK_FAILURES = [
  'Failed to fetch', // Chromium
  'NetworkError when attempting to fetch resource.', // Firefox
  'Load failed', // Safari
]

export function isChunkLoadError(error: unknown): boolean {
  return (
    error instanceof Error &&
    CHUNK_LOAD_FAILURES.some((text) => error.message.includes(text))
  )
}

export function shouldReport(error: unknown): boolean {
  if (error instanceof ApiError || error instanceof MessageRefusedError) return false
  if (isChunkLoadError(error)) return false
  if (error instanceof TypeError && NETWORK_FAILURES.includes(error.message)) return false
  if (error instanceof DOMException && ['AbortError', 'TimeoutError'].includes(error.name)) {
    return false
  }
  return true
}

// The reference a crash page shows (a crash has no request, so no request
// id): 8 random hex characters, sent with the report as its `reference` tag
// — the same length and shape as a request's (api/apiErrors.ts), which the
// backend's tunnel checks.
export function newReference(): string {
  return shortReference(crypto.randomUUID())
}