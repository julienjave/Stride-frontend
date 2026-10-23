import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiError } from '@/api/client'
import { type FailedQuery, LoadError, LoadFailure } from './LoadError'

function apiError(statusCode: number) {
  return new ApiError({ statusCode, message: ['x'], error: 'Error', timestamp: '', path: '' })
}

type TestQuery = FailedQuery & { refetch: ReturnType<typeof vi.fn> }

// A query as these components read it: plain values and a spy for `refetch`
// (whose answer, by default, is a retry that worked).
function query(fields: Partial<FailedQuery> = {}): TestQuery {
  return {
    isError: false,
    error: null,
    isFetching: false,
    refetch: vi.fn(() => Promise.resolve({ isError: false })),
    ...fields,
  } as TestQuery
}

// A retry whose answer the test releases — in the browser the block that was
// pressed unmounts as soon as the retry starts (the page shows "Loading…"),
// long before the answer comes back.
function heldRetry() {
  let answer: (result: { isError: boolean }) => void = () => {}
  const refetch = vi.fn(() => new Promise<{ isError: boolean }>((resolve) => (answer = resolve)))
  return { refetch, fails: () => answer({ isError: true }), works: () => answer({ isError: false }) }
}

// Lets the retry's `.then` run.
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

// A request that failed (a network error), and the same while it is asked
// again: what TanStack Query reports during a refetch of a failed query —
// still `isError` (the last answer was an error), and `isFetching`.
const failedQuery = (fields: Partial<FailedQuery> = {}) =>
  query({ isError: true, error: new TypeError('Failed to fetch'), ...fields })

describe('LoadError', () => {
  it('says what failed, and "Try again" asks again — only the requests that failed', async () => {
    const user = userEvent.setup()
    const failed = failedQuery()
    const fine = query()
    render(
      <LoadError what="this program" queries={[fine, failed]}>
        <a href="/patient">Back to home</a>
      </LoadError>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(/^Couldn't load this program\.$/)
    expect(screen.getByRole('link', { name: 'Back to home' })).toBeInTheDocument()
    const button = screen.getByRole('button', { name: 'Try again' })
    expect(button).toHaveAttribute('aria-disabled', 'false')
    await user.click(button)
    expect(failed.refetch).toHaveBeenCalledTimes(1)
    expect(fine.refetch).not.toHaveBeenCalled()
  })

  it('asks again EVERY request that failed', async () => {
    const user = userEvent.setup()
    const first = failedQuery()
    const second = failedQuery()
    render(<LoadError what="this program" queries={[first, second]} />)
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(first.refetch).toHaveBeenCalledTimes(1)
    expect(second.refetch).toHaveBeenCalledTimes(1)
  })

  it('while retrying: says so, ignores presses, and keeps focus on the button', async () => {
    const user = userEvent.setup()
    const failed = failedQuery()
    const { rerender } = render(<LoadError what="this program" queries={[failed]} />)
    const button = screen.getByRole('button', { name: 'Try again' })
    button.focus()
    const retrying = failedQuery({ isFetching: true })
    rerender(<LoadError what="this program" queries={[retrying]} />)

    expect(button).toHaveAccessibleName('Trying again…')
    // aria-disabled, not disabled: a disabled button would lose focus.
    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(button).not.toBeDisabled()
    expect(button).toHaveFocus()
    await user.click(button)
    await user.keyboard('{Enter}')
    expect(retrying.refetch).not.toHaveBeenCalled()
  })

  it('is "trying again" only while a FAILED request is fetching', () => {
    render(<LoadError what="this program" queries={[failedQuery(), query({ isFetching: true })]} />)
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  // The usual case: the request never succeeded, so TanStack Query puts it
  // back to "pending" for the retry — the page shows "Loading…", this block
  // unmounts, and a NEW one appears if the retry fails.
  it('the block that replaces a pressed one (a failed retry) says "Still" and takes focus', async () => {
    const user = userEvent.setup()
    const what = 'the retried page'
    const retry = heldRetry()
    const { unmount } = render(<LoadError what={what} queries={[failedQuery({ refetch: retry.refetch })]} />)
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    unmount()
    retry.fails()
    await settle()
    render(<LoadError what={what} queries={[failedQuery()]} />)
    expect(screen.getByRole('alert')).toHaveTextContent(/^Still couldn't load the retried page\.$/)
    expect(screen.getByRole('button', { name: 'Try again' })).toHaveFocus()
  })

  it('remembers a press only for the block that replaces it', async () => {
    const user = userEvent.setup()
    const retry = heldRetry()
    const { unmount } = render(<LoadError what="page A" queries={[failedQuery({ refetch: retry.refetch })]} />)
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    unmount()
    retry.fails()
    await settle()
    // Another page's error: not "Still", focus left alone…
    const other = render(<LoadError what="page B" queries={[failedQuery()]} />)
    expect(screen.getByRole('alert')).toHaveTextContent(/^Couldn't load page B\.$/)
    expect(screen.getByRole('button', { name: 'Try again' })).not.toHaveFocus()
    other.unmount()
    // …and the memory is spent once used.
    render(<LoadError what="page A" queries={[failedQuery()]} />).unmount()
    render(<LoadError what="page A" queries={[failedQuery()]} />)
    expect(screen.getByRole('alert')).toHaveTextContent(/^Couldn't load page A\.$/)
  })

  it('a retry that worked leaves nothing behind for a later error', async () => {
    const user = userEvent.setup()
    const what = 'the page that came back'
    const retry = heldRetry()
    const { unmount } = render(<LoadError what={what} queries={[failedQuery({ refetch: retry.refetch })]} />)
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    unmount()
    retry.works()
    await settle()
    render(<LoadError what={what} queries={[failedQuery()]} />)
    expect(screen.getByRole('alert')).toHaveTextContent(/^Couldn't load the page that came back\.$/)
    expect(screen.getByRole('button', { name: 'Try again' })).not.toHaveFocus()
  })

  it('a failure seen IN PLACE leaves nothing behind either (it has said so already)', async () => {
    const user = userEvent.setup()
    const what = 'the page that stayed'
    const retry = heldRetry()
    const { rerender, unmount } = render(
      <LoadError what={what} queries={[failedQuery({ refetch: retry.refetch })]} />,
    )
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    rerender(<LoadError what={what} queries={[failedQuery({ isFetching: true })]} />)
    retry.fails()
    await settle()
    rerender(<LoadError what={what} queries={[failedQuery()]} />)
    expect(screen.getByRole('alert')).toHaveTextContent(/^Still couldn't load the page that stayed\.$/)
    unmount()
    render(<LoadError what={what} queries={[failedQuery()]} />)
    expect(screen.getByRole('alert')).toHaveTextContent(/^Couldn't load the page that stayed\.$/)
  })

  it('forgets a press after 30 seconds', async () => {
    const user = userEvent.setup()
    const what = 'the page left alone'
    const retry = heldRetry()
    const { unmount } = render(<LoadError what={what} queries={[failedQuery({ refetch: retry.refetch })]} />)
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    unmount()
    retry.fails()
    await settle()
    const now = Date.now()
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now + 30_000)
    try {
      render(<LoadError what={what} queries={[failedQuery()]} />)
      expect(screen.getByRole('alert')).toHaveTextContent(/^Couldn't load the page left alone\.$/)
    } finally {
      clock.mockRestore()
    }
  })

  // The other case: the data was on screen and a later refetch failed — the
  // query stays in error while it refetches, so this block stays too.
  it('a retry that fails again IN PLACE changes the words, so a screen reader hears it', () => {
    const { rerender } = render(<LoadError what="this program" queries={[failedQuery()]} />)
    rerender(<LoadError what="this program" queries={[failedQuery({ isFetching: true })]} />)
    // Still the first words while the request is under way.
    expect(screen.getByRole('alert')).toHaveTextContent(/^Couldn't load this program\.$/)
    rerender(<LoadError what="this program" queries={[failedQuery()]} />)
    expect(screen.getByRole('alert')).toHaveTextContent(/^Still couldn't load this program\.$/)
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})

describe('LoadFailure', () => {
  const notAvailable = <p>Not available here</p>

  it('shows "not available" for a 404 — with no "Try again": asking again cannot help', () => {
    render(
      <LoadFailure
        queries={[query({ isError: true, error: apiError(404) })]}
        what="this program"
        notAvailable={notAvailable}
      />,
    )
    expect(screen.getByText('Not available here')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('a 404 on ANY of the failed requests is enough', () => {
    render(
      <LoadFailure
        queries={[
          query({ isError: true, error: apiError(500) }),
          query({ isError: true, error: apiError(404) }),
        ]}
        what="this program"
        notAvailable={notAvailable}
      />,
    )
    expect(screen.getByText('Not available here')).toBeInTheDocument()
  })

  it('reads "not available" the resource\'s own way when it says so', () => {
    const forbidden = [query({ isError: true, error: apiError(403) })]
    const { rerender } = render(
      <LoadFailure queries={forbidden} what="this conversation" notAvailable={notAvailable} />,
    )
    // By default a 403 is a failure to load…
    expect(screen.queryByText('Not available here')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load this conversation.")
    // …unless the resource counts it as "not available".
    rerender(
      <LoadFailure
        queries={forbidden}
        what="this conversation"
        notAvailable={notAvailable}
        isNotAvailable={(error) => error instanceof ApiError && error.statusCode === 403}
      />,
    )
    expect(screen.getByText('Not available here')).toBeInTheDocument()
  })

  it('any other failure: the load error, with the ways out, asking again what failed', async () => {
    const user = userEvent.setup()
    const failed = failedQuery()
    render(
      <LoadFailure queries={[query(), failed]} what="this program" notAvailable={notAvailable}>
        <a href="/patient">Back to home</a>
      </LoadFailure>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(/^Couldn't load this program\.$/)
    expect(screen.getByRole('link', { name: 'Back to home' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(failed.refetch).toHaveBeenCalledTimes(1)
  })
})