import { useQuery } from '@tanstack/react-query'
import { assignedProgramSummaryQueryKey, fetchAssignedProgramSummary } from './api'

// A program's progress as judged on `today` (the viewer's date, chosen by
// the page). `enabled` lets the page wait until it knows the program can
// be seen at all: no summary request for a program that answered 404.
//
// `fresh` (added 2026-10-16, the session flow's start and skip pages): for a
// page that DECIDES an action from the answer — start, resume, skip — the
// cache isn't good enough: an answer cached minutes ago can say "a session is
// open" for one stopped since. `staleTime: 0` asks again on every visit; the
// page waits for that answer (`isFetchedAfterMount`) before deciding. Pages
// that only SHOW the summary keep the app's 30 s.
//
// `through` (2026-10-18, the patient's program page): cover at least to that
// day — the backend's `?through=`. The patient's screens all ask with the
// same one (today + SUMMARY_HORIZON_DAYS), so the program page reuses the
// summary the hub and the home already cached. Absent: the key and the
// request are as before.
export function useAssignedProgramSummary(
  id: number,
  today: string,
  {
    enabled = true,
    fresh = false,
    through,
  }: { enabled?: boolean; fresh?: boolean; through?: string } = {},
) {
  return useQuery({
    queryKey: assignedProgramSummaryQueryKey(id, today, through),
    queryFn: () => fetchAssignedProgramSummary(id, today, through),
    enabled,
    ...(fresh ? { staleTime: 0 } : {}),
  })
}