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

import { useEffect, useState } from 'react'
import { isRouteErrorResponse, useRouteError } from 'react-router'
import { referenceText } from '@/api/apiErrors'
import { Button } from '@/components/ui/button'
import { isErrorReportingOn, reportError } from '@/observability/errorReporting'
import { isChunkLoadError, newReference } from '@/observability/reportRules'

// The root route's errorElement (routes.tsx): what a visitor sees when a
// route fails, instead of React Router's built-in developer screen.
//
// Three cases, each with its own words (told apart since 2026-10-31 —
// observability pass 3):
// - No route matches the address — React Router answers with a 404
//   "route error response" (isRouteErrorResponse).
// - A PAGE FILE that couldn't be downloaded (each page is a separate file
//   since 2026-10-15 — the connection dropped, or a new version was deployed
//   and the old file is gone, see staleChunkReload.ts). The reader's side,
//   or an update: "check your connection, then reload".
// - A page that CRASHED while rendering: a bug of ours. Saying "check your
//   connection" there would send the reader looking for a problem they don't
//   have — so it says it's on our side, offers a reload (a crash can depend
//   on the moment's data), and shows the report's reference.
// (Any other route error response — none is thrown today — keeps the
// download wording: reloading is the safe advice.)
//
// Links here are plain <a href>, not <Link>: after a failure the safest
// way out is a full page load, which fetches the current version of the
// app. The page is deliberately free of the app's layout (it may be what
// failed) and of any data fetching.
export function RouteErrorPage() {
  const error = useRouteError()
  const notFound = isRouteErrorResponse(error) && error.status === 404

  // A page that CRASHED (not a missing address, not a page file that
  // couldn't be downloaded — reportRules.ts says why those aren't bugs) is
  // reported (decisions §32, pass 3), with a reference made here: shown on
  // screen, sent as the report's tag — what a person reads to the clinic
  // finds the report. Made once (useState's initialiser), and only when
  // reporting is on: a reference that leads nowhere would only mislead.
  const crashed = !isRouteErrorResponse(error) && !isChunkLoadError(error)
  const [reference] = useState(() => (crashed && isErrorReportingOn() ? newReference() : null))

  // The details belong in the browser console for whoever debugs it, and in
  // the report — not on the visitor's screen.
  useEffect(() => {
    if (!notFound) console.error(error)
    if (reference) reportError(error, { where: 'route-error', reference })
  }, [error, notFound, reference])

  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      {notFound ? (
        <>
          <h1 className="text-xl font-semibold">This page doesn't exist</h1>
          <p className="text-sm text-muted-foreground">
            The address may be mistyped, or the page may have moved.
          </p>
        </>
      ) : crashed ? (
        <>
          <h1 className="text-xl font-semibold">Something went wrong on this page</h1>
          <p className="text-sm text-muted-foreground">
            This is a problem on our side, not with your connection. Reloading
            the page may get past it.
          </p>
          {reference && <p className="text-sm text-muted-foreground">{referenceText(reference)}</p>}
          <ReloadButton />
        </>
      ) : (
        <>
          <h1 className="text-xl font-semibold">This page couldn't be loaded</h1>
          <p className="text-sm text-muted-foreground">
            Check your connection, then reload. If Stride was just updated,
            reloading gets you the new version.
          </p>
          <ReloadButton />
        </>
      )}
      <p className="text-sm">
        <a href="/" className="underline underline-offset-4">
          Go to the home page
        </a>
      </p>
    </main>
  )
}

// A full page load: it fetches the current version of the app too.
function ReloadButton() {
  return (
    <Button type="button" onClick={() => window.location.reload()}>
      Reload the page
    </Button>
  )
}