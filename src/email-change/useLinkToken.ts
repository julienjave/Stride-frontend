import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

// The token of an emailed link (`?token=…`), read ONCE, then removed from
// the address — the reset page's rule (an address holding a key to the
// account mustn't stay in the history, nor travel to another site as a
// Referer). useState's initialiser runs on the first render only, so the
// token survives its own removal. null when the page was opened without one.
export function useLinkToken(): string | null {
  const [searchParams, setSearchParams] = useSearchParams()
  const [token] = useState(() => searchParams.get('token'))
  useEffect(() => {
    if (searchParams.has('token')) setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])
  return token
}