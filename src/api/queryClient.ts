import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './client'

// A single, shared QueryClient instance for the whole app — created once
// here, imported everywhere else, rather than each feature creating its
// own. TanStack Query's cache lives inside this object, so there must be
// exactly one for caching to actually work across different components.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // By default, TanStack Query treats cached data as instantly "stale"
      // and refetches aggressively (e.g. every time a window regains
      // focus). A short staleTime here means "trust this data for 30
      // seconds before considering a background refetch" — a reasonable
      // default for most of this app's data, which doesn't change every
      // second. Individual queries can still override this per-endpoint
      // where it matters (e.g. messaging will want something closer to 0,
      // since it's WebSocket-driven and freshness matters more there).
      staleTime: 1000 * 30,

      // Don't blindly retry a failed request 3 times (the library's
      // default) — some failures are never going to succeed on retry.
      // A 401 (not logged in) or 403 (not allowed) or 404 (doesn't exist,
      // or an RLS-hidden resource per FRONTEND.md's real gotcha) will
      // fail identically on attempt 2 and 3 — retrying just delays the UI
      // from showing the real state for no benefit. Only retry on
      // genuinely transient failures (network errors, 5xx) — those don't
      // reach this function as an ApiError with a statusCode at all if
      // they're a raw network failure, so we specifically check for the
      // status codes that ARE worth giving up on immediately.
      retry: (failureCount, error) => {
        if (error instanceof ApiError) {
          if ([401, 403, 404, 429].includes(error.statusCode)) return false
        }
        return failureCount < 2
      },
    },
  },
})