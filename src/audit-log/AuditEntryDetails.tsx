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

import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { describeDetails } from './auditDetails'
import type { AuditLogEntry } from './types'

// What one entry records beyond its line: the record it points at, its
// details made readable (auditDetails.ts), and — for anything the readable
// form leaves out or for a reviewer who wants the exact stored values — the
// raw entry behind its own toggle.
export function AuditEntryDetails({ entry }: { entry: AuditLogEntry }) {
  const [showRaw, setShowRaw] = useState(false)
  const rawId = useId()
  // The action too: some actions' stored values get plain words.
  const items = describeDetails(entry.details, {}, entry.action)

  return (
    <div className="space-y-3 rounded-md bg-muted/40 p-3 text-sm">
      {entry.entityId === null && items.length === 0 ? (
        <p className="text-muted-foreground">No further details.</p>
      ) : (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          {entry.entityId !== null && (
            <>
              <dt className="text-muted-foreground">Record</dt>
              <dd>
                {entry.area} #{entry.entityId}
              </dd>
            </>
          )}
          {items.map((item, index) =>
            item.type === 'value' ? (
              <div key={index} className="contents">
                <dt className="text-muted-foreground">{item.label}</dt>
                <dd className="min-w-0 wrap-break-word">{item.value}</dd>
              </div>
            ) : (
              <div key={index} className="col-span-2 mt-1">
                <dt className="text-muted-foreground">Changes</dt>
                <dd className="overflow-x-auto">
                  <table className="mt-1 w-full text-left">
                    <thead>
                      <tr className="text-xs text-muted-foreground">
                        <th scope="col" className="pr-4 font-normal">
                          Field
                        </th>
                        <th scope="col" className="pr-4 font-normal">
                          Before
                        </th>
                        <th scope="col" className="font-normal">
                          After
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.rows.map((row) => (
                        <tr key={row.field} className="align-top">
                          <th scope="row" className="pr-4 font-normal">
                            {row.field}
                          </th>
                          <td className="pr-4 wrap-break-word">{row.from}</td>
                          <td className="wrap-break-word">{row.to}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </dd>
              </div>
            ),
          )}
        </dl>
      )}

      <Button
        type="button"
        variant="link"
        size="sm"
        className="h-auto p-0"
        aria-expanded={showRaw}
        aria-controls={rawId}
        onClick={() => setShowRaw((shown) => !shown)}
      >
        {showRaw ? 'Hide the raw entry' : 'Show the raw entry'}
      </Button>
      {/* Rendered only while open — the button's aria-controls points at an
          element that exists whenever it matters. */}
      {showRaw && (
        <pre id={rawId} className="max-h-80 overflow-auto rounded bg-background p-2 text-xs">
          {JSON.stringify(entry, null, 2)}
        </pre>
      )}
    </div>
  )
}