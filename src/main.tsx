import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './api/queryClient'
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
      <App />
    </QueryClientProvider>
  </StrictMode>,
)