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

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './api/queryClient'
import { ThemeProvider } from './theme/ThemeProvider'
import './index.css'
import App from './App.tsx'
import { installStaleChunkReload } from './app/staleChunkReload'
import { installErrorReporting } from './observability/errorReporting'

// Before anything renders: errors nobody catches are reported from here on
// (the SDK itself arrives later — see errorReporting.ts), and a page file
// missing after a new deploy reloads the app onto the new version (see
// staleChunkReload.ts).
installErrorReporting()
installStaleChunkReload()

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