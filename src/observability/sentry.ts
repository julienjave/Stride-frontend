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

import * as Sentry from '@sentry/react'
import type { BrowserReportingConfig } from './errorReportingConfig'
import { scrubBrowserEvent } from './reportScrub'

// The Sentry SDK itself — the only file that imports it. It is loaded ON
// DEMAND (errorReporting.ts, `import('./sentry')`), so Vite puts it, and the
// ~90 kB of SDK it pulls in, in a file of its own that the browser fetches
// after the app has started (the person's choice, decisions §32: the first
// download doesn't grow).

// The SDK's options for the browser, every choice written out: the defaults
// change between releases (v11 began collecting cookies, headers, bodies and
// query strings unless told not to).
export function browserReportingOptions(config: BrowserReportingConfig): Sentry.BrowserOptions {
  return {
    dsn: config.dsn,
    // Envelopes go to OUR API (`POST /monitoring`), never to GlitchTip
    // directly: GlitchTip isn't on the internet, the server scrubs again and
    // sets the session's user, and ad-blockers don't drop a request to the
    // app's own API.
    tunnel: config.tunnel,
    // The tunnel reads WHO sent the report from the session cookie: the SDK's
    // fetch must send it to another origin (the API's), so `include`. The
    // backend's CORS already allows credentials from the frontend's origin.
    transportOptions: { fetchOptions: { credentials: 'include' } },
    environment: config.environment,
    release: config.release,

    // v11 replaced `sendDefaultPii` with these keys, one per kind of data,
    // each collected unless switched off.
    dataCollection: {
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
    },

    // The integrations, CHOSEN — `defaultIntegrations: false` turns off the
    // SDK's defaults, and this list says which come back:
    //   eventFilters           drop known browser noise
    //   functionToString       readable function names
    //   linkedErrors           Error.cause chains
    // Left out: dedupe — it drops an event equal to the one before, so the
    // SAME crash twice (the person comes back to the page, it crashes again)
    // would show a second reference that finds no report; the reporter skips
    // the same error OBJECT itself (errorReporting.ts — React's StrictMode
    // runs effects twice in development); breadcrumbs (every click with its
    // TEXT — names on screen —,
    // every console line, every request's address), globalHandlers (our own
    // listeners catch uncaught errors from the first line, before this file
    // has arrived — errorReporting.ts), browserApiErrors (wraps timers and
    // event listeners), httpContext (the page's address WITH its query, and
    // the browser's headers), browserSession (a "session" envelope per page
    // load), and of course no Replay, no tracing.
    defaultIntegrations: false,
    integrations: [
      Sentry.eventFiltersIntegration(),
      Sentry.functionToStringIntegration(),
      Sentry.linkedErrorsIntegration(),
    ],
    maxBreadcrumbs: 0,
    sendClientReports: false,

    beforeSend: (event) => scrubBrowserEvent(event),
  }
}

// What errorReporting.ts asks of this file: send one error, with its tags.
export type Capture = (error: unknown, tags: Record<string, string>) => void

// Starts the SDK and answers the capture function. `extra` lets a test give
// the SDK a transport that keeps envelopes in memory.
export function startSdk(
  config: BrowserReportingConfig,
  extra: Partial<Sentry.BrowserOptions> = {},
): Capture {
  Sentry.init({ ...browserReportingOptions(config), ...extra })
  return (error, tags) => {
    Sentry.captureException(error, { tags })
  }
}