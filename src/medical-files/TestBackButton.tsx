import { useNavigate } from 'react-router'

// A test-only control: the browser's Back, for tests that check where it
// leads (renderMedicalFile mounts it above the routes). In a file of its own
// because a file exporting a component should export ONLY components (React
// Fast Refresh's lint rule).
export function TestBackButton() {
  const navigate = useNavigate()
  return (
    <button type="button" onClick={() => void navigate(-1)}>
      test: back
    </button>
  )
}