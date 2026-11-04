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
import { Button } from '@/components/ui/button'
import type { TodayRow } from './todayRow'

// A Today row on screen — the words above, the buttons beside them from
// `sm` up and under them on a phone (a narrow column of text beside a
// button reads badly at 375 px). Shared by the home (one row per program,
// `eyebrow` = the program's title) and the Sessions hub (one per program
// card, `eyebrow` = "Today"). Drawing only: what the row says and offers
// is todayRow's decision.
export function TodayRowView({
  eyebrow,
  programTitle,
  row,
}: {
  eyebrow: string
  // For the buttons' accessible names: with several programs, a list of
  // plain "Start" links can't be told apart.
  programTitle: string
  row: TodayRow
}) {
  const { text, notes, action, secondary } = row
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-0.5">
        <p className="text-sm text-muted-foreground">{eyebrow}</p>
        <p className="font-medium">{text.line}</p>
        {text.detail && <p className="text-sm text-muted-foreground">{text.detail}</p>}
        {notes.map((note) => (
          // A row's notes are different sentences: the text is a key.
          <p key={note} className="text-sm text-muted-foreground">
            {note}
          </p>
        ))}
      </div>
      {action && (
        <div className="flex shrink-0 flex-wrap gap-2 self-start">
          <Button asChild>
            {/* Named with the program; the visible word starts the name
                (voice control: "click Start" must find it). */}
            <Link to={action.to} aria-label={`${action.verb} ${programTitle}`}>
              {action.verb}
            </Link>
          </Button>
          {secondary && (
            <Button asChild variant="outline">
              <Link to={secondary.to} aria-label={`${secondary.verb}: ${programTitle}`}>
                {secondary.verb}
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}