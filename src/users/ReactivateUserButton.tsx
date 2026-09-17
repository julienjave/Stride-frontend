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
import { ApiError } from '@/api/client'
import { reactivateUser, userQueryKey } from './api'

interface ReactivateUserButtonProps {
  userId: number
  userName: string
}

// Only ever rendered when the user is currently deactivated (see
// UserEditPage). No isSelf guard needed the way DeactivateUserButton has
// one — reactivating your OWN account isn't the dangerous direction (you
// can't be viewing this page as a deactivated admin in the first place,
// since deactivation signs you out immediately).
export function ReactivateUserButton({ userId, userName }: ReactivateUserButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()

  const reactivateMutation = useMutation({
    mutationFn: () => reactivateUser(userId),
    onSuccess: (updated) => {
      // Same "the response IS the full authoritative state" reasoning as
      // DeactivateUserButton — reactivate() returns the complete updated
      // user, so this goes straight into the cache.
      queryClient.setQueryData(userQueryKey(userId), updated)
      // Prefix match, not exact — same reasoning as DeactivateUserButton:
      // this user needs to disappear from the include-inactive list and
      // (re)appear in the active-only one, and 'users-list' is a
      // deliberately separate top-level key from userQueryKey(userId).
      void queryClient.invalidateQueries({ queryKey: ['users-list'] })
      setIsOpen(false)
    },
  })

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Reactivate user</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reactivate {userName}?</DialogTitle>
          <DialogDescription>
            This restores {userName}'s access — they'll be able to log in again with their
            existing password, and everything from before (medical history, programs,
            messages) is still attached to this same account.
          </DialogDescription>
        </DialogHeader>

        {reactivateMutation.isError && (
          <p className="text-sm text-destructive">
            {reactivateMutation.error instanceof ApiError
              ? reactivateMutation.error.messages.join(', ')
              : 'Something went wrong'}
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