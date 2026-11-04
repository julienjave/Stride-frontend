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

import type { Ref } from 'react'
import { UserAvatar } from '@/common/UserAvatar'

interface HomeGreetingProps {
  // The user's id, for their avatar's tint (UserAvatar).
  userId: number
  firstName: string
  lastName: string
  avatarUrl: string | null
  // A page's focus target after a "Try again" that worked (useRetryFocus) —
  // the patient home's, when its list of programs came back. Given → the
  // heading is focusable by code (tabIndex -1), not by Tab.
  headingRef?: Ref<HTMLHeadingElement>
}

// The top of every role's home page: the user's avatar (photo, or initials
// when there's none or it fails to load — see UserAvatar) and "Hello
// <first name>,". Shared because every home has the same structure
// (design decisions §2 and §3): the practitioner and admin homes use it
// today, the patient home will.
//
// It takes the three fields it shows as props rather than reading
// useCurrentUser() itself. The page already has the user (it needs it for
// other things), and a component that only displays what it's given is
// simpler to reason about and to test than one that fetches.
export function HomeGreeting({ userId, firstName, lastName, avatarUrl, headingRef }: HomeGreetingProps) {
  return (
    <div className="flex items-center gap-3">
      <UserAvatar
        userId={userId}
        firstName={firstName}
        lastName={lastName}
        avatarUrl={avatarUrl}
        className="size-12 text-sm"
      />
      <h1
        ref={headingRef}
        tabIndex={headingRef ? -1 : undefined}
        className="text-xl font-semibold outline-none"
      >
        Hello {firstName},
      </h1>
    </div>
  )
}