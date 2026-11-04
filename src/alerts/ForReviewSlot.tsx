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

import { ClipboardCheck } from 'lucide-react'
import { alertCountText } from './alertText'
import { useAlerts } from './useAlerts'

// The home card's "For review" slot (2026-10-19 — first called "To-do";
// renamed the same day with the person: "To-do" promised tasks, and the
// roadmap keeps that name for a task list the practitioner manages), replacing
// its "Coming soon": how many things need a look, as a link down to the list
// (the For review section, id "review"). Same look as the card's other slots (TodaySlot in
// app/home/HomeSummaryCard.tsx, MessagesSlot): icon, small label, value.
//
// The same query as the section (useAlerts with the same `today`): one
// request feeds both. While it loads the slot shows nothing in its value
// line rather than a number that would jump; on an error it says so in
// words — the section below explains.
export function ForReviewSlot({ today }: { today: string }) {
  const alerts = useAlerts(today)
  return (
    <div className="flex flex-col items-center gap-1">
      <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
      <span className="text-xs uppercase text-muted-foreground">For review</span>
      {alerts.isSuccess && (
        // A plain <a>, not React Router's <Link>: "#review" is a spot on THIS
        // page — the browser scrolls to the element with that id (and moves
        // the reading position there), no navigation involved.
        <a href="#review" className="text-sm font-medium underline-offset-4 hover:underline">
          {alertCountText(alerts.data.length)}
        </a>
      )}
      {alerts.isError && <span className="text-sm text-muted-foreground">Unavailable</span>}
    </div>
  )
}