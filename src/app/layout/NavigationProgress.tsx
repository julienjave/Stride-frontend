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

import { useNavigation } from 'react-router'

// A thin bar along the bottom edge of the top bar while a navigation is in
// progress — since code splitting (routes.tsx), the first visit to a page
// waits for its file, and the page you're leaving stays on screen
// meanwhile. Without a sign, a tap on a slow phone connection looks
// ignored, and people tap again.
//
// useNavigation() is the data router's own state: 'idle', or 'loading' /
// 'submitting' while it gets the next route ready (here: downloading a
// page's file). Nothing to track by hand.
//
// For screen readers: a status region that is ALWAYS in the page and only
// changes its text (a region appearing already filled is often not
// announced). The bar itself is decoration (aria-hidden).
export function NavigationProgress() {
  const navigation = useNavigation()
  const loading = navigation.state !== 'idle'

  return (
    <>
      {loading && (
        <div
          aria-hidden="true"
          data-testid="navigation-progress"
          className="absolute inset-x-0 bottom-0 h-0.5 animate-pulse bg-primary"
        />
      )}
      <p role="status" className="sr-only">
        {loading ? 'Loading page…' : ''}
      </p>
    </>
  )
}