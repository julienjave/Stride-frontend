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
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { failureText } from '@/api/apiErrors'
import { deactivateClinic, clinicQueryKey } from './api'
import { showSuccess } from '@/snackbars/snackbarStore'

interface DeactivateClinicButtonProps {
  clinicId: number
  clinicName: string
}

// Only ever rendered when the clinic is currently active (see
// ClinicEditPage, which renders ReactivateClinicButton instead once
// isActive is false). A real reactivate path now exists — see
// ClinicsService.reactivate() and ReactivateClinicButton — mirroring the
// same capability built for users.
export function DeactivateClinicButton({ clinicId, clinicName }: DeactivateClinicButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const deactivateMutation = useMutation({
    mutationFn: () => deactivateClinic(clinicId),
    onSuccess: (updated) => {
      // Same "the response IS the full authoritative state" reasoning as
      // useSaveClinic's saves — writing it straight into the detail
      // cache means anything reading clinicQueryKey(clinicId) already
      // reflects isActive: false with no extra round trip.
      queryClient.setQueryData(clinicQueryKey(clinicId), updated)
      // Prefix match on 'clinics-list' (not exact) — sweeps BOTH cached
      // list variants (this clinic needs to vanish from the active-only
      // one and appear correctly in the include-inactive one). Safe from
      // colliding with clinicQueryKey(clinicId) written just above:
      // clinicsListQueryKey uses a distinct top-level key ('clinics-list',
      // not 'clinics') specifically so this kind of prefix invalidation
      // can never touch it.
      void queryClient.invalidateQueries({ queryKey: ['clinics-list'] })
      setIsOpen(false)
      // The active list it lands on no longer shows the clinic: a snackbar
      // (decisions §33) says where it went.
      showSuccess(`Deactivated ${clinicName}. It's no longer in the active clinics list.`)
      // The active-only list no longer shows this clinic, so staying on
      // its own now-easy-to-lose-track-of detail page would be a dead
      // end for anyone browsing the default (active-only) view.
      void navigate('/admin/clinics')
    },
  })

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">Deactivate clinic</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deactivate {clinicName}?</DialogTitle>
          {/* Honest, specific copy — not vague "are you sure?" text.
              Someone confirming this should know exactly what happens:
              the clinic disappears from the active list, and reactivating
              it is an admin action from this same page, not automatic. */}
          <DialogDescription>
            This removes {clinicName} from the active clinics list, until an admin
            reactivates it from here.
          </DialogDescription>
        </DialogHeader>

        {deactivateMutation.isError && (
          <p className="text-sm text-destructive">
            {failureText(deactivateMutation.error)}
          </p>
        )}

        <DialogFooter>
          {/* DialogClose, not a manual onClick — Radix's own close
              mechanism, which still correctly respects `disabled` (a
              disabled button never fires the click DialogClose listens
              for), so Cancel can't be used to dodge a save-in-progress. */}
          <DialogClose asChild>
            <Button variant="outline" disabled={deactivateMutation.isPending}>
              Cancel
            </Button>
          </DialogClose>
          {/* Deliberately NOT a DialogClose — this one has to stay open
              on failure (so the error message above stays visible) and
              only close, via setIsOpen(false) in onSuccess above, once
              the mutation actually succeeds. */}
          <Button
            variant="destructive"
            onClick={() => deactivateMutation.mutate()}
            disabled={deactivateMutation.isPending}
          >
            {deactivateMutation.isPending ? 'Deactivating…' : 'Deactivate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}