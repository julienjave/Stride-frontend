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