import { useEffect, useRef, useState, type ReactNode } from 'react'
import { isNotFound } from '@/api/apiErrors'
import { Button } from '@/components/ui/button'
import { loadErrorText } from './loadErrorText'
import { forgetRetry, isFailedRetry, rememberRetry, retryAnswered } from './retryMemory'

// The minimum of a query a page needs to report its failure — what TanStack
// Query's result has. A structural type, so every query's result fits it,
// whatever its data (a page waiting on two different queries passes both).
export interface FailedQuery {
  isError: boolean
  error: unknown
  isFetching: boolean
  // What TanStack Query's refetch answers: the query's result once settled.
  refetch: () => Promise<{ isError: boolean }>
}

// The one decision every page of a row-security-guarded record makes when
// its request(s) failed (written out on each page before, 2026-10-23):
// - "not available" (a 404, by default) on ANY of them → the caller's
//   NotAvailable: asking again can't change that answer;
// - anything else → LoadError, with "Try again".
export function LoadFailure({
  queries,
  what,
  notAvailable,
  isNotAvailable = isNotFound,
  children,
}: {
  queries: readonly FailedQuery[]
  // For LoadError's sentence: "this program".
  what: string
  // What to show for "not available" — each resource words it its own way.
  notAvailable: ReactNode
  // Which errors mean "not available": a 404 unless the resource says more
  // (a conversation that isn't mine is a 403).
  isNotAvailable?: (error: unknown) => boolean
  // Ways out under "Try again".
  children?: ReactNode
}) {
  if (queries.some((query) => query.isError && isNotAvailable(query.error))) return notAvailable
  return (
    <LoadError what={what} queries={queries}>
      {children}
    </LoadError>
  )
}

// What a page shows when its record couldn't be loaded for a reason OTHER
// than "not available" (a 404 has NotAvailable): the network dropped, the
// server answered 500. Phase 6, "Honest empty / error states" (2026-10-23).
//
// Before, every such page said "Couldn't load this … Try refreshing the
// page." A refresh throws away everything else on the page and reloads the
// whole app to repeat ONE request. "Try again" repeats just that request
// (the query's `refetch`), with the app's usual retries for transient
// failures (`api/queryClient.ts`: two more attempts on a network error or a
// 5xx). If it then succeeds, the page simply renders its data.
//
// It takes the QUERIES, not a "retrying" flag and a callback: what "trying
// again" means — refetch the requests that failed, and only those (a page
// waiting on two, a program then its summary, doesn't reload the one that
// worked) — is decided here, once, rather than wired by hand on every page.
//
// WHAT A RETRY LOOKS LIKE depends on whether the request ever succeeded —
// TanStack Query's own rule (found in the live check, 2026-10-23):
// - Never succeeded (the usual case: the page failed on its way in): a
//   refetch puts the query back to "pending" — it forgets the error
//   (query-core's `fetchState`: no data → `status: 'pending', error: null`).
//   The page shows its "Loading…" again, and THIS component unmounts. If
//   the retry fails, a NEW LoadError appears. So the press is remembered
//   OUTSIDE the component (`retryMemory.ts`): the new one says "Still
//   couldn't …" and puts keyboard focus back on its button — the button the
//   user pressed is gone, and focus with it, to the top of the page.
// - Succeeded before (the data is on screen, a later refetch failed): the
//   query stays in error while it refetches, so this component stays too —
//   the button reads "Trying again…" and is aria-disabled, NOT disabled (a
//   disabled button loses keyboard focus in Chromium); a failure seen in
//   place changes the words the same way.
// "Still couldn't …": a live region only speaks when its content CHANGES (or
// appears), so the same sentence again would leave a screen-reader user
// unsure whether anything happened.
//
// THE PRESS ITSELF is remembered in `retryMemory.ts` (outside any component,
// for the reason above) — and since 2026-10-28 it serves the other outcome
// too: when the retry WORKS, the content's heading takes focus
// (`useRetryFocus`), instead of focus falling to the top of the page.
//
// THE WORDS say why, too (since 2026-10-28): "Couldn't load this program."
// followed by the shared rule's reason — "Something went wrong on our side…",
// a 429's wait, or "Check your connection…" (`loadErrorText.ts`).

export function LoadError({
  what,
  queries,
  children,
}: {
  // What failed, as it ends the sentence: "this program", "your records".
  what: string
  // The page's requests; those that failed are asked again.
  queries: readonly FailedQuery[]
  // Optional ways out, under the button (the page's "Back to home").
  children?: ReactNode
}) {
  const failed = queries.filter((query) => query.isError)
  const retrying = failed.some((query) => query.isFetching)
  const button = useRef<HTMLButtonElement>(null)
  // Whether this component is still on screen when a retry's answer comes
  // back (the click handler outlives it).
  const shown = useRef(false)

  // Read ONCE, at mount: am I the block that replaces one whose retry
  // failed? (A pure read — the initialiser may run twice under StrictMode;
  // the memory is spent in the effect.)
  const [afterRetry] = useState(() => isFailedRetry(what))
  useEffect(() => {
    shown.current = true
    if (afterRetry) {
      forgetRetry(what)
      button.current?.focus()
    }
    return () => {
      shown.current = false
    }
  }, [afterRetry, what])

  // How many retries came back still failing. At mount: one, if this block
  // replaces one that was pressed. In place: counted by watching `retrying`
  // fall back to false while this block is still shown — "adjusting state
  // while rendering", React's documented pattern for deriving state from a
  // changed value without an effect (an effect would show the old words
  // once more first).
  const [failedRetries, setFailedRetries] = useState(afterRetry ? 1 : 0)
  const [wasRetrying, setWasRetrying] = useState(retrying)
  if (retrying !== wasRetrying) {
    setWasRetrying(retrying)
    if (!retrying) setFailedRetries((count) => count + 1)
  }

  function retry() {
    if (retrying) return
    const press = rememberRetry(what)
    void Promise.all(failed.map((query) => query.refetch())).then((results) => {
      // Recorded for whatever comes next (retryMemory.ts says who takes it):
      // worked → the content's heading; failed → the block that replaces
      // this one — unless this one is still shown, and has said so in place.
      retryAnswered(
        press,
        results.every((result) => !result.isError),
        shown.current,
      )
    })
  }

  return (
    <div className="space-y-3">
      <p role="alert" className="text-sm text-destructive">
        {/* The FIRST failed request's reason: when two failed, they almost
            always failed for the same one (the network, the server). */}
        {loadErrorText(what, failed[0]?.error, failedRetries > 0)}
      </p>
      {/* A line of its own: the ways out below are often inline links, which
          would otherwise sit right against the button (seen at 375 px). */}
      <div>
        <Button
          ref={button}
          type="button"
          variant="outline"
          // The shared Button greys out only for `disabled`; the same look here.
          className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
          aria-disabled={retrying}
          onClick={retry}
        >
          {retrying ? 'Trying again…' : 'Try again'}
        </Button>
      </div>
      {children}
    </div>
  )
}