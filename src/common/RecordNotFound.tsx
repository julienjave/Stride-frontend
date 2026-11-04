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

import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { type FailedQuery, LoadFailure } from './LoadError'
import { type NotAvailableLink, NotAvailable } from './NotAvailable'

// The pages of ONE record that no row-security rule hides — an exercise, a
// template, a user, a clinic (Phase 6, the load-error pass, 2026-10-28,
// decided with the person). For them a 404 has ONE meaning: there is no such
// record. An old bookmark, a mistyped id, a link to something that never
// existed. (Archived exercises and templates still load, with their own
// "deleted" notice: a 404 isn't "deleted".)
//
// Before, those pages said "Couldn't load this exercise. Try refreshing." — a
// refresh asks the same question and gets the same 404. Now: the shared
// "not available" shape (a heading, one sentence, ways out), with no "Try
// again", since asking again can't change the answer. It's the same shape as
// the row-security resources' pages (`NotAvailable`), but in plainer words:
// "not found" is TRUE here, so the heading says it — the programs' "not
// available" exists because a hidden record must not be told from a missing
// one, which doesn't apply.
//
// A malformed id ("/admin/users/abc") gets the same page without a request:
// it can't be a record either.

function Column({ children }: { children: ReactNode }) {
  return <div className="mx-auto mt-8 max-w-2xl px-4">{children}</div>
}

interface NotFoundProps {
  // "exercise" → "Exercise not found", "There's no exercise at this address."
  noun: string
  // Where to go instead — the record's list, usually.
  links: [NotAvailableLink, ...NotAvailableLink[]]
}

function NotFoundBody({ noun, links }: NotFoundProps) {
  const title = `${noun[0].toUpperCase()}${noun.slice(1)} not found`
  return (
    <NotAvailable title={title} links={links}>
      There's no {noun} at this address. The link may be wrong or out of date.
    </NotAvailable>
  )
}

export function RecordNotFound(props: NotFoundProps) {
  return (
    <Column>
      <NotFoundBody {...props} />
    </Column>
  )
}

// The record's read failed: "not found" for a 404, otherwise the load error
// with "Try again" — and the same ways out under it, so a failed page is
// never a dead end.
export function RecordLoadFailed({
  queries,
  what,
  ...notFound
}: NotFoundProps & {
  queries: readonly FailedQuery[]
  // For the load error's sentence: "this exercise".
  what: string
}) {
  return (
    <Column>
      <LoadFailure queries={queries} what={what} notAvailable={<NotFoundBody {...notFound} />}>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {notFound.links.map((link) => (
            <Link key={link.to} to={link.to} className="underline underline-offset-4">
              {link.label}
            </Link>
          ))}
        </div>
      </LoadFailure>
    </Column>
  )
}