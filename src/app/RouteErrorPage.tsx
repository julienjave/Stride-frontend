import { useEffect } from 'react'
import { isRouteErrorResponse, useRouteError } from 'react-router'
import { Button } from '@/components/ui/button'

// The root route's errorElement (routes.tsx): what a visitor sees when a
// route fails, instead of React Router's built-in developer screen.
//
// Two cases:
// - No route matches the address — React Router answers with a 404
//   "route error response" (isRouteErrorResponse).
// - Anything else: most likely a PAGE FILE that couldn't be downloaded
//   (each page is a separate file since 2026-10-15 — the connection
//   dropped, or a new version was deployed and the old file is gone, see
//   staleChunkReload.ts), or a page that crashed while rendering. Reloading
//   is the fix for the first, and harmless for the second.
//
// Links here are plain <a href>, not <Link>: after a failure the safest
// way out is a full page load, which fetches the current version of the
// app. The page is deliberately free of the app's layout (it may be what
// failed) and of any data fetching.
export function RouteErrorPage() {
  const error = useRouteError()
  const notFound = isRouteErrorResponse(error) && error.status === 404

  // The details belong in the browser console for whoever debugs it, not
  // on the visitor's screen.
  useEffect(() => {
    if (!notFound) console.error(error)
  }, [error, notFound])

  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      {notFound ? (
        <>
          <h1 className="text-xl font-semibold">This page doesn't exist</h1>
          <p className="text-sm text-muted-foreground">
            The address may be mistyped, or the page may have moved.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-xl font-semibold">This page couldn't be loaded</h1>
          <p className="text-sm text-muted-foreground">
            Check your connection, then reload. If Stride was just updated,
            reloading gets you the new version.
          </p>
          <Button type="button" onClick={() => window.location.reload()}>
            Reload the page
          </Button>
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