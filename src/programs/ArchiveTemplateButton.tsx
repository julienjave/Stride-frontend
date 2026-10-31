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
import { archiveTemplate, programQueryKey } from './api'
import { removeFromProgramsList } from './programsListCache'
import { showSuccess } from '@/snackbars/snackbarStore'

interface ArchiveTemplateButtonProps {
  templateId: number
  templateTitle: string
}

// A close mirror of ArchiveExerciseButton. Labeled "Delete", since that's
// the word a practitioner thinks in, even though what really happens is
// an archive (isArchived: true, the row stays). The dialog copy is honest
// about two things that are true TODAY:
//
// - There's no way back. No unarchive endpoint exists for templates
//   (UpdateTemplateDto doesn't include isArchived, and no restore route
//   exists), so the copy says so rather than implying an undo.
// - Assigned programs are safe. They're a snapshot copy of a template's
//   exercises taken at assignment time, never a live reference to it —
//   the first thing a practitioner would worry about, answered up front.
export function ArchiveTemplateButton({
  templateId,
  templateTitle,
}: ArchiveTemplateButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const archiveMutation = useMutation({
    mutationFn: () => archiveTemplate(templateId),
    onSuccess: (updated) => {
      // The detail entry now says isArchived: true — so if this page is
      // ever reached again through older browser history, it renders the
      // read-only "deleted" view immediately from cache, never a stale
      // editable one.
      queryClient.setQueryData(programQueryKey(templateId), updated)
      // Taken out of the hub's cached list BEFORE navigating there — see
      // programsListCache.ts for why invalidating alone would leave the
      // deleted template visible (and clickable) on the hub for a moment.
      removeFromProgramsList(queryClient, templateId)
      setIsOpen(false)
      // The template leaves the screen with this page: the hub says what
      // happened in a snackbar (decisions §33), repeating the one reassurance
      // of the confirmation — the patients' programs are untouched.
      showSuccess(`Deleted ${templateTitle}. Programs already assigned from it are not affected.`)
      // replace, not push: this page's history entry is SWAPPED for the
      // hub, rather than the hub being stacked on top of it. So pressing
      // the browser's Back button from the hub doesn't land right back on
      // the template that was just deleted.
      void navigate('/practitioner/programs', { replace: true })
    },
  })

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {templateTitle}?</DialogTitle>
          <DialogDescription>
            This removes {templateTitle} from your templates. Programs already
            assigned to patients from it are not affected. There is currently
            no way to restore it once deleted.
          </DialogDescription>
        </DialogHeader>

        {archiveMutation.isError && (
          <p className="text-sm text-destructive">
            {failureText(archiveMutation.error)}
          </p>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={archiveMutation.isPending}>
              Cancel
            </Button>
          </DialogClose>
          {/* Deliberately NOT a DialogClose — same reasoning as
              ArchiveExerciseButton: the dialog has to stay open on
              failure so the error above stays visible, and only closes
              via setIsOpen(false) once the archive truly succeeded. */}
          <Button
            variant="destructive"
            onClick={() => archiveMutation.mutate()}
            disabled={archiveMutation.isPending}
          >
            {archiveMutation.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}