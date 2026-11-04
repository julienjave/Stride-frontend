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

import type { QueryClient } from '@tanstack/react-query'
import { programsListQueryKey } from './api'
import type { ProgramTemplate, ProgramTemplateDetail } from './types'

// Small helpers for keeping the templates LIST cache (programsListQueryKey,
// what ProgramsPage and ExerciseAssignPage read) in step with a change
// made somewhere else — a rename, a new template, a duplicate, an archive.
//
// Why not just invalidateQueries() like the Library does? Because of
// staleTime. The app-wide queryClient sets staleTime to 30 seconds, and
// invalidation alone only MARKS the list stale — whatever is already in
// the cache is still what renders first when you land on the hub, and
// the refetch replaces it a moment later. For a rename that's a brief
// flicker of the old title; for an archive, it's a deleted template
// showing up as a real, clickable card. Patching the cache directly
// makes the very first paint correct. Callers still invalidate AFTER
// patching, so the server gets the final word once the refetch lands.
//
// Every helper here is a no-op when the list has never been fetched:
// setQueryData's updater receives undefined in that case, and returning
// undefined tells TanStack Query "leave this entry alone" — there's no
// list to patch, and the first visit to the hub will fetch a fresh one
// anyway.

// GET /programs returns bare template rows — no exercises array. Most
// responses these helpers receive DO carry one (every write except
// POST /programs returns the full detail shape), so it's stripped here
// to keep the list cache holding the same shape the real list endpoint
// returns, rather than a mix of the two. Accepts either shape, since a
// ProgramTemplateDetail IS a ProgramTemplate plus one extra field.
function toListItem(
  template: ProgramTemplate | ProgramTemplateDetail,
): ProgramTemplate {
  return {
    id: template.id,
    practitionerId: template.practitionerId,
    title: template.title,
    description: template.description,
    isArchived: template.isArchived,
  }
}

// Replaces the matching entry in place, or appends it if it isn't there
// yet (a brand-new or just-duplicated template). Appended at the END,
// matching where GET /programs puts new rows in practice.
export function upsertInProgramsList(
  queryClient: QueryClient,
  template: ProgramTemplate | ProgramTemplateDetail,
) {
  queryClient.setQueryData<ProgramTemplate[]>(programsListQueryKey, (list) => {
    if (!list) return undefined
    const item = toListItem(template)
    return list.some((existing) => existing.id === item.id)
      ? list.map((existing) => (existing.id === item.id ? item : existing))
      : [...list, item]
  })
  void queryClient.invalidateQueries({ queryKey: programsListQueryKey })
}

// For archiving — GET /programs never returns archived templates, so the
// patched list shouldn't either.
export function removeFromProgramsList(
  queryClient: QueryClient,
  templateId: number,
) {
  queryClient.setQueryData<ProgramTemplate[]>(programsListQueryKey, (list) =>
    list ? list.filter((existing) => existing.id !== templateId) : undefined,
  )
  void queryClient.invalidateQueries({ queryKey: programsListQueryKey })
}