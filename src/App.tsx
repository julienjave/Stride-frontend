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

import { RouterProvider } from 'react-router'
import { router } from '@/app/routes'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { Loading } from '@/common/Loading'
import { useAccountFont } from '@/theme/useAccountFont'

function App() {
  // Runs once, high in the tree, so by the time anything below this needs
  // to know "is someone logged in, and as what role," the answer is
  // already resolved and cached. Every other component that needs the
  // current user (route guards, a header showing the user's name, the
  // role switcher) calls this SAME hook — one shared cache entry, not one
  // fetch per component that happens to need it.
  const { isLoading } = useCurrentUser()
  // The "Easier-to-read font" follows whoever is signed in — here, beside
  // the bootstrap, so it runs on every page, the sign-in page included
  // (where it puts the default font back once someone has signed out).
  useAccountFont()

  // While the very first /auth/me check is in flight, we genuinely don't
  // know yet whether to show a login screen or the real app — rendering
  // the router before this resolves would risk a flash of the wrong
  // screen. A brief loading state here is the correct, deliberate cost.
  if (isLoading) {
    return <Loading className="p-4" />
  }

  return <RouterProvider router={router} />
}

export default App