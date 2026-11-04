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

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { failureText } from '@/api/apiErrors'
import { useClinics } from '@/clinics/useClinics'
import { addClinicMember, removeClinicMember } from '@/clinics/api'
import { userQueryKey } from './api'
import { refreshAttention } from './attention'

interface UserClinicMembershipsProps {
  userId: number
  currentClinics: { id: number; name: string }[]
}

export function UserClinicMemberships({
  userId,
  currentClinics,
}: UserClinicMembershipsProps) {
  const queryClient = useQueryClient()
  const { data: allClinics } = useClinics()
  const [selectedClinicId, setSelectedClinicId] = useState<string>('')

  // Neither addClinicMember() nor removeClinicMember() returns anything
  // useful to write straight into the cache (the add response is just the
  // raw membership row — no clinic name — and the remove response is
  // empty). Both mutations invalidate this user's OWN cache entry
  // instead, so the next read pulls the real, authoritative clinics list
  // (with names) from GET /users/:id — the same reasoning as the comment
  // on addClinicMember/removeClinicMember in clinics/api.ts.
  //
  // Care teams too (added 2026-10-09, with the care team on this page): a
  // membership change can change care teams. Removing one ENDS the links
  // left without a shared clinic (the backend does it in the same
  // transaction — decisions §3), and adding one brings new candidates. For a
  // patient that's their own team; for a practitioner, the teams of any of
  // their patients — so the whole ['care-team'] prefix is refreshed.
  //
  // And the admin home's "needs attention" (decisions §17): a membership
  // added or removed can move a practitioner into or out of "without a
  // clinic", and — through the links it ends — patients into "without a care
  // team" (refreshAttention).
  const invalidateThisUser = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: userQueryKey(userId), exact: true }),
      queryClient.invalidateQueries({ queryKey: ['care-team'] }),
      refreshAttention(queryClient),
    ])

  const addMutation = useMutation({
    mutationFn: (clinicId: number) => addClinicMember(clinicId, userId),
    onSuccess: () => {
      setSelectedClinicId('')
      void invalidateThisUser()
    },
  })

  // One shared mutation for every "Remove" button, rather than each row
  // owning its own — variables (the clinicId being removed) is what lets
  // a specific row show its OWN pending state below, without needing N
  // separate useMutation instances for what's fundamentally the same
  // action repeated per row.
  const removeMutation = useMutation({
    mutationFn: (clinicId: number) => removeClinicMember(clinicId, userId),
    onSuccess: () => void invalidateThisUser(),
  })

  // Only offer clinics the user ISN'T already in — both because adding a
  // duplicate membership would just fail against the backend's own unique
  // constraint (userId, clinicId), and because a dropdown that includes
  // clinics already joined would be a confusing thing to click.
  const currentClinicIds = new Set(currentClinics.map((c) => c.id))
  const availableClinics = (allClinics ?? []).filter(
    (clinic) => !currentClinicIds.has(clinic.id),
  )

  return (
    <div className="space-y-2 py-2">
      <p className="text-sm text-muted-foreground">Clinics</p>

      {currentClinics.length === 0 ? (
        <p className="text-sm text-muted-foreground">Not a member of any clinic yet.</p>
      ) : (
        <ul className="space-y-1">
          {currentClinics.map((clinic) => (
            <li key={clinic.id} className="flex items-center justify-between text-sm">
              <span>{clinic.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={removeMutation.isPending && removeMutation.variables === clinic.id}
                onClick={() => removeMutation.mutate(clinic.id)}
              >
                {removeMutation.isPending && removeMutation.variables === clinic.id
                  ? 'Removing…'
                  : 'Remove'}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <Select value={selectedClinicId} onValueChange={setSelectedClinicId}>
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={
                availableClinics.length === 0 ? 'No other clinics to add' : 'Add a clinic'
              }
            />
          </SelectTrigger>
          <SelectContent>
            {availableClinics.map((clinic) => (
              <SelectItem key={clinic.id} value={String(clinic.id)}>
                {clinic.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="sm"
          disabled={!selectedClinicId || addMutation.isPending}
          onClick={() => addMutation.mutate(Number(selectedClinicId))}
        >
          {addMutation.isPending ? 'Adding…' : 'Add'}
        </Button>
      </div>

      {removeMutation.isError && (
        <p className="text-sm text-destructive">
          {failureText(removeMutation.error, 'Could not remove that clinic.')}
        </p>
      )}
      {addMutation.isError && (
        <p className="text-sm text-destructive">
          {failureText(addMutation.error, 'Could not add that clinic.')}
        </p>
      )}
    </div>
  )
}