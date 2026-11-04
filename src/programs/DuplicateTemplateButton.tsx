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

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { failureText } from '@/api/apiErrors'
import { duplicateTemplate, programQueryKey } from './api'
import { upsertInProgramsList } from './programsListCache'
import { showSuccess } from '@/snackbars/snackbarStore'

interface DuplicateTemplateButtonProps {
  templateId: number
}

// Offered on every live template the practitioner can see, their own or
// a colleague's — for someone else's template, duplicating is the only
// way to build on it, since the original is read-only to them. No
// confirmation dialog: duplicating creates something new and changes
// nothing that already exists, so there's nothing to confirm.
export function DuplicateTemplateButton({
  templateId,
}: DuplicateTemplateButtonProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const duplicateMutation = useMutation({
    mutationFn: () => duplicateTemplate(templateId),
    onSuccess: (copy) => {
      // Seed the NEW template's own cache entry (copy.id — not
      // templateId, which is the source) with the full response. The page
      // navigated to below then renders instantly from cache, instead of
      // showing "Loading…" while it fetches something we already have.
      queryClient.setQueryData(programQueryKey(copy.id), copy)
      upsertInProgramsList(queryClient, copy)
      // The copy's page looks almost exactly like the original's — only the
      // title's "Copy of" tells them apart. A snackbar (decisions §33) says
      // which one is now on screen, so nobody edits the original by mistake.
      showSuccess(`Duplicated the template. You're now on the copy, "${copy.title}".`)
      // Push, not replace (unlike archiving): the source template still
      // exists and is a perfectly sensible place for Back to return to.
      void navigate(`/practitioner/programs/templates/${copy.id}`)
    },
  })

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="outline"
        onClick={() => duplicateMutation.mutate()}
        disabled={duplicateMutation.isPending}
      >
        {duplicateMutation.isPending ? 'Duplicating…' : 'Duplicate'}
      </Button>
      {duplicateMutation.isError && (
        <p className="text-sm text-destructive">
          {failureText(duplicateMutation.error)}
        </p>
      )}
    </div>
  )
}