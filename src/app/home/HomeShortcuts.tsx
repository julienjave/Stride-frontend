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

import { Link } from 'react-router'

export interface HomeShortcut {
  label: string
  to: string
}

// The links at the bottom of a home page, into the role's sections that
// have real pages. They repeat part of the persistent navigation on
// purpose: on a home page, big labelled buttons are the obvious "where to
// next". Sections that are only "Coming soon" are left out — the
// navigation already offers those.
export function HomeShortcuts({ links }: { links: HomeShortcut[] }) {
  return (
    // A <nav> is a "navigation" landmark; the layout already has one
    // ("Sections"), so this one gets its own name to tell them apart for a
    // screen-reader user jumping between landmarks.
    //
    // One column on phones; from `sm` up, one equal column per link
    // (grid-flow-col + auto-cols-fr — see HomeSummaryCard for why not
    // grid-cols-N), so three practitioner links and two admin links both
    // fill the row.
    <nav aria-label="Shortcuts" className="grid gap-2 sm:auto-cols-fr sm:grid-flow-col">
      {links.map((link) => (
        // key: React's way of matching list items between renders. A link's
        // path is unique within the list and stable, so it's a good key.
        <Link
          key={link.to}
          to={link.to}
          className="rounded-lg border p-3 text-center hover:bg-muted"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  )
}