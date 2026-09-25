import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './api/queryClient'
import { ThemeProvider } from './theme/ThemeProvider'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* QueryClientProvider makes the single shared queryClient instance
        available to every component below it via React context — this is
        what lets a component anywhere in the tree call useQuery()/
        useMutation() and share the same cache, without prop-drilling the
        client down manually through every layer. */}
    <QueryClientProvider client={queryClient}>
      {/* ThemeProvider sits above the whole app (router included), so
          every page — the login screen too — follows the chosen theme,
          and "System" tracks the OS even where no Settings menu exists. */}
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)