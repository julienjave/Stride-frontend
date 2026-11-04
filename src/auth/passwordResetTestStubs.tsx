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

import { useLocation, useNavigate } from 'react-router'

// Test-only stubs for renderPasswordReset — components alone in their file
// (React Fast Refresh's lint rule: a file exporting a component exports only
// components).

// What the address bar would show — to prove the token left it.
export function Address() {
  const location = useLocation()
  return <p data-testid="address">{location.pathname + location.search}</p>
}

export function LoginStub() {
  const location = useLocation()
  return <p data-testid="login-state">{JSON.stringify(location.state)}</p>
}

// The browser's Back, for the tests that check where it leads.
export function TestBack() {
  const navigate = useNavigate()
  return (
    <button type="button" onClick={() => void navigate(-1)}>
      test: back
    </button>
  )
}