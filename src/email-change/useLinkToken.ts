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