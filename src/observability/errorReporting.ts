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

import { browserReportingConfig, type BrowserReportingConfig } from './errorReportingConfig'
import { shouldReport } from './reportRules'
import type { Capture, startSdk } from './sentry'

// The browser's error reports (decisions §32, pass 3). This file is SMALL
// and in the app's first download; the SDK isn't (sentry.ts, loaded on
// demand — the person's choice: the first download doesn't grow).
//
// The trick that makes loading it late safe: every report goes through
// `report()`, which WAITS for the SDK. An error in the first second — before
// the SDK's file has arrived — is caught by our own listeners (installed on
// the first line of main.tsx) and simply sent a moment later, once it has.
// The SDK's own global handlers aren't used for that reason: they would only
// see errors after it loaded.
//
// Where reports come from:
//   'route-error'          a page that crashed while rendering — React
//                          Router catches it and shows RouteErrorPage, which
//                          reports it (and shows its reference)
//   'uncaught'             an error thrown outside React's rendering (an
//                          event handler, a timer) — the window's `error`
//                          event; React also hands an error that escapes
//                          every boundary to it
//   'unhandled-rejection'  a promise that failed with nobody listening
//
// With no VITE_SENTRY_DSN (development, every test) nothing is loaded and
// `report()` does nothing.

export type ReportWhere = 'route-error' | 'uncaught' | 'unhandled-rejection'

export interface ReportContext {
  where: ReportWhere
  // The crash page's reference (reportRules.ts, newReference), shown to the
  // person and sent as a tag so the report can be found by it.
  reference?: string
}

export interface ErrorReporter {
  readonly isOn: boolean
  // Starts loading the SDK (once); answers how to capture, or null when
  // reporting is off or the SDK's file couldn't be loaded.
  start: () => Promise<Capture | null>
  report: (error: unknown, context: ReportContext) => void
}

type LoadSdk = () => Promise<{ startSdk: typeof startSdk }>

export function createErrorReporter(
  config: BrowserReportingConfig | null,
  load: LoadSdk,
  currentPath: () => string = () => window.location.pathname,
): ErrorReporter {
  let sdk: Promise<Capture | null> | null = null
  // The same error object reported once: React's StrictMode runs effects
  // twice in development, and an error can reach two listeners.
  const reported = new WeakSet<object>()

  function start(): Promise<Capture | null> {
    if (!config) return Promise.resolve(null)
    // A file that can't be downloaded (offline, a new version deployed) means
    // no reports for this page — never an error of its own, which would be
    // reported, fail to load the file again… a loop.
    sdk ??= load().then(
      (module) => module.startSdk(config),
      () => null,
    )
    return sdk
  }

  function report(error: unknown, context: ReportContext): void {
    if (!config || !shouldReport(error)) return
    if (typeof error === 'object' && error !== null) {
      if (reported.has(error)) return
      reported.add(error)
    }
    // Read NOW, not when the SDK arrives: the person may have moved on.
    // A path only — `pathname` never holds the query or the hash (and the
    // scrub cuts them anyway).
    const tags: Record<string, string> = { where: context.where, route: currentPath() }
    if (context.reference) tags.reference = context.reference
    void start().then((capture) => capture?.(error, tags))
  }

  return { isOn: config !== null, start, report }
}

// The app's one reporter. `import('./sentry')` is what makes Vite put the SDK
// in a file of its own.
const appReporter = createErrorReporter(browserReportingConfig(), () => import('./sentry'))

export function reportError(error: unknown, context: ReportContext): void {
  appReporter.report(error, context)
}

export function isErrorReportingOn(): boolean {
  return appReporter.isOn
}

// Called on the FIRST line of main.tsx: the listeners exist before anything
// else runs. The SDK's file is fetched once the page has finished loading —
// it never competes with the app's own files — or earlier, by the first
// report.
export function installErrorReporting(
  target: Pick<Window, 'addEventListener'> = window,
  reporter: ErrorReporter = appReporter,
  pageLoaded: () => boolean = () => document.readyState === 'complete',
): void {
  if (!reporter.isOn) return
  target.addEventListener('error', (event) => {
    // `error` is the thrown value; a resource that failed to load (an image)
    // fires an event without one, and isn't a bug of ours.
    if (event.error !== undefined && event.error !== null) {
      reporter.report(event.error, { where: 'uncaught' })
    }
  })
  target.addEventListener('unhandledrejection', (event) => {
    reporter.report(event.reason, { where: 'unhandled-rejection' })
  })
  if (pageLoaded()) void reporter.start()
  else target.addEventListener('load', () => void reporter.start(), { once: true })
}