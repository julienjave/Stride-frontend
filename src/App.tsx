import { RouterProvider } from 'react-router'
import { router } from '@/app/routes'

// App's only job now is handing the route tree to RouterProvider — every
// actual page (LoginPage, DashboardPage, and everything we add later)
// lives in routes.tsx instead. This is deliberately thin: App.tsx
// shouldn't accumulate real logic itself.
function App() {
  return <RouterProvider router={router} />
}

export default App