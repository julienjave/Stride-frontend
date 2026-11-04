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
import { reactivateClinic, clinicQueryKey } from './api'

interface ReactivateClinicButtonProps {
  clinicId: number
  clinicName: string
}

// Only ever rendered when the clinic is currently deactivated (see
// ClinicEditPage). Mirrors ReactivateUserButton exactly.
export function ReactivateClinicButton({ clinicId, clinicName }: ReactivateClinicButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()

  const reactivateMutation = useMutation({
    mutationFn: () => reactivateClinic(clinicId),
    onSuccess: (updated) => {
      queryClient.setQueryData(clinicQueryKey(clinicId), updated)
      void queryClient.invalidateQueries({ queryKey: ['clinics-list'] })
      setIsOpen(false)
    },
  })

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Reactivate clinic</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reactivate {clinicName}?</DialogTitle>
          <DialogDescription>
            This restores {clinicName} to the active clinics list — everything about it
            (members, programs, history) is still attached to this same clinic.
          </DialogDescription>
        </DialogHeader>

        {reactivateMutation.isError && (
          <p className="text-sm text-destructive">
            {failureText(reactivateMutation.error)}
          </p>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={reactivateMutation.isPending}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={() => reactivateMutation.mutate()}
            disabled={reactivateMutation.isPending}
          >
            {reactivateMutation.isPending ? 'Reactivating…' : 'Reactivate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}