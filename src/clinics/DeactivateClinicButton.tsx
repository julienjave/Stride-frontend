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
import { ApiError } from '@/api/client'
import { deactivateClinic, clinicQueryKey, clinicsQueryKey } from './api'

interface DeactivateClinicButtonProps {
  clinicId: number
  clinicName: string
}

// Only ever rendered when the clinic is currently active (see
// ClinicEditPage) — there is deliberately no equivalent "reactivate"
// button anywhere, because no such route exists on the backend yet (see
// deferred-improvements.md). Offering an action with nothing behind it
// would be worse than not offering it at all.
export function DeactivateClinicButton({ clinicId, clinicName }: DeactivateClinicButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const deactivateMutation = useMutation({
    mutationFn: () => deactivateClinic(clinicId),
    onSuccess: (updated) => {
      // Same "the response IS the full authoritative state" reasoning as
      // EditableClinicField's saves — writing it straight into the detail
      // cache means anything reading clinicQueryKey(clinicId) already
      // reflects isActive: false with no extra round trip.
      queryClient.setQueryData(clinicQueryKey(clinicId), updated)
      // exact: true for the same reason it matters everywhere else in
      // this feature — invalidating clinicsQueryKey without it would also
      // invalidate the very clinicQueryKey(clinicId) entry just written
      // above, undoing the point of setQueryData.
      void queryClient.invalidateQueries({ queryKey: clinicsQueryKey, exact: true })
      setIsOpen(false)
      // findAll() filters to isActive: true, so this clinic is about to
      // vanish from the list — staying on its own now-orphaned detail
      // page would be a dead end. Not staying to show a "deactivated"
      // confirmation state either: the list is the correct place to see
      // the clinic is gone, not a page for a clinic that no longer
      // appears anywhere else in the app.
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
          {/* Honest, specific copy about the real, currently-deliberate
              limitation — not vague "are you sure?" text. Someone
              confirming this should know exactly what they're accepting:
              not just "this clinic disappears from the list," but that
              there is no undo button anywhere in the app for this today. */}
          <DialogDescription>
            This removes {clinicName} from the active clinics list. This can't currently be
            undone from within the app — restoring a deactivated clinic requires direct database
            access.
          </DialogDescription>
        </DialogHeader>

        {deactivateMutation.isError && (
          <p className="text-sm text-destructive">
            {deactivateMutation.error instanceof ApiError
              ? deactivateMutation.error.messages.join(', ')
              : 'Something went wrong'}
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