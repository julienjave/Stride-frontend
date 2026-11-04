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

import type { ErrorEvent, Exception, StackFrame } from '@sentry/react'

// What a browser error report may hold (decisions §32 — the rule the
// backend's logs and reports follow too): nothing that names or locates a
// patient. Given to the SDK as `beforeSend`: the report is BUILT AGAIN from
// an allow-list of fields — never "the SDK's event minus a few keys", which
// a new SDK version could widen by adding a field.
//
// This is the FIRST of two locks. The second is the backend's tunnel
// (`POST /monitoring`, backend observability/report-scrub.ts), which rebuilds
// the report again from its own allow-list before passing it on: the
// browser's code may be old, modified or simply wrong, and the server is the
// one place the rule can be enforced. This lock keeps the data from leaving
// the browser at all — off our own server's request bodies too.
//
// Kept:
//   identity   event_id, timestamp, platform, level, release, environment,
//              sdk (name + version)
//   the error  exception values: type, value (emails removed), mechanism,
//              stack frames — file (no query), function, line, column,
//              in_app; never `vars`
//   tags       where, route (a PATH: no query, no hash), reference
// Dropped: user (the tunnel sets the SESSION's account id), request (the
// page's address with its query, headers), breadcrumbs, extra, contexts,
// everything else.

const KEPT_TAGS = ['where', 'route', 'reference'] as const
const MAX_TEXT = 1_000

// The same shape as the backend's (observability/log-scrub.ts, EMAIL): an
// address in an error's message ("No account for jane@…") becomes "[email]".
const EMAIL = /[^\s@<>"'(),;:[\]]+@[^\s@<>"'(),;:[\]]+\.[A-Za-z]{2,}/g

export function scrubBrowserEvent(event: ErrorEvent): ErrorEvent {
  const scrubbed: ErrorEvent = {
    type: event.type,
    event_id: event.event_id,
    timestamp: event.timestamp,
    platform: event.platform,
    level: event.level,
    release: event.release,
    environment: event.environment,
  }
  if (event.sdk) scrubbed.sdk = { name: event.sdk.name, version: event.sdk.version }
  if (event.message) scrubbed.message = scrubText(event.message)
  if (event.exception?.values) {
    scrubbed.exception = { values: event.exception.values.map(scrubException) }
  }
  const tags = keptTags(event.tags)
  if (tags) scrubbed.tags = tags
  return withoutUndefined(scrubbed)
}

// The part of an address before its query string or fragment: a page's
// address can carry a search ("/patients?search=Jane"), a script's a token.
export function pathOnly(url: string): string {
  const end = url.search(/[?#]/)
  return end === -1 ? url : url.slice(0, end)
}

export function scrubText(text: string): string {
  return text.replace(EMAIL, '[email]').slice(0, MAX_TEXT)
}

function scrubException(exception: Exception): Exception {
  return withoutUndefined({
    type: exception.type ? scrubText(exception.type) : undefined,
    value: exception.value ? scrubText(exception.value) : undefined,
    mechanism: exception.mechanism
      ? { type: exception.mechanism.type, handled: exception.mechanism.handled }
      : undefined,
    stacktrace: exception.stacktrace?.frames
      ? { frames: exception.stacktrace.frames.map(scrubFrame) }
      : undefined,
  })
}

function scrubFrame(frame: StackFrame): StackFrame {
  return withoutUndefined({
    filename: frame.filename ? pathOnly(frame.filename) : undefined,
    abs_path: frame.abs_path ? pathOnly(frame.abs_path) : undefined,
    function: frame.function,
    lineno: frame.lineno,
    colno: frame.colno,
    in_app: frame.in_app,
  })
}

function keptTags(tags: ErrorEvent['tags']): ErrorEvent['tags'] | undefined {
  if (!tags) return undefined
  const kept: NonNullable<ErrorEvent['tags']> = {}
  for (const key of KEPT_TAGS) {
    const value = tags[key]
    if (typeof value === 'string') kept[key] = scrubText(pathOnly(value))
  }
  return Object.keys(kept).length > 0 ? kept : undefined
}

// The keys whose value is undefined, removed: the object then equals what is
// sent (JSON drops them anyway), so a test can compare with toStrictEqual.
function withoutUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T
}