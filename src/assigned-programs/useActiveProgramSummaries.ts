import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { addDays } from '@/common/calendarDate'
import { assignedProgramSummaryQueryKey, fetchAssignedProgramSummary } from './api'
import { activePrograms } from './patientPrograms'
import { useAssignedPrograms } from './useAssignedPrograms'

// How far ahead the summaries read: today and the 13 days after — two
// weeks. Sent as the summary's `through`, so an open-ended program's summary
// reaches that far too (by default it stops at the end of the current
// program week, which can be today) — the home's Upcoming needs it.
export const SUMMARY_HORIZON_DAYS = 13

// The patient's programs and one summary per ACTIVE program, for the
// patient's `today` (chosen once by the page). Was the home's own hook
// (usePatientHome) until 2026-10-17; moved here — renamed for what it
// returns — when the Sessions hub became its second reader:
//   1. their programs — GET /assigned-programs, which answers a patient with
//      their OWN programs (the backend scopes it by role). The same cache
//      entry as the practitioner's list: a role switch removes every cached
//      query (useSwitchRole), so one account can never see another role's
//      list under this key.
//   2. one summary per active program, in parallel.
//
// Both screens ask with the SAME key (program, today, through): the second
// screen opened finds the summaries already cached, and a write that
// invalidates the `summary` prefix refreshes both.
//
// Why useQueries: the number of summaries depends on data (how many
// programs), and React's rules of hooks forbid calling useQuery in a loop —
// a hook must be called the same number of times on every render.
// useQueries takes an ARRAY of queries, one hook call whatever its length,
// and answers an array in the same order. Each summary keeps its own cache
// entry (under its program's key), so each one's loading or failure is its
// own.
export function useActiveProgramSummaries(today: string) {
  const list = useAssignedPrograms()
  // useMemo: a new array only when the list itself changes — otherwise
  // every render would build new query options for useQueries.
  const programs = useMemo(() => activePrograms(list.data ?? []), [list.data])
  const through = addDays(today, SUMMARY_HORIZON_DAYS)
  const summaries = useQueries({
    queries: programs.map((program) => ({
      queryKey: assignedProgramSummaryQueryKey(program.id, today, through),
      queryFn: () => fetchAssignedProgramSummary(program.id, today, through),
    })),
  })
  return { list, programs, summaries }
}