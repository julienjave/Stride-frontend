import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCurrentUser } from '@/auth/useCurrentUser'
import {
  createRomAssessment,
  fetchMovementCatalogue,
  fetchRangeOfMotion,
  fetchRomAssessment,
  movementCatalogueQueryKey,
  rangeOfMotionQueryKey,
  romAssessmentQueryKey,
} from './api'

// The ways the screens read and write range of motion — the shape of
// medical-files/useMedicalFile.ts. Each READ of a patient's assessments is
// audited, so each is called only by a page that shows what it reads.

// The catalogue never changes while the app runs (it changes with a new
// backend, and a new backend means a reload): `staleTime: Infinity` — read
// once per visit, then served from the cache to every page that needs it.
export function useMovementCatalogue() {
  return useQuery({
    queryKey: movementCatalogueQueryKey,
    queryFn: fetchMovementCatalogue,
    staleTime: Infinity,
  })
}

// A patient's assessments, as their practitioner opens them.
export function useRangeOfMotion(patientId: number) {
  return useQuery({
    queryKey: rangeOfMotionQueryKey(patientId),
    queryFn: () => fetchRangeOfMotion(patientId),
  })
}

// The signed-in patient's own (My records). The id is for the cache key
// only — the request names nobody (useMyMedicalFile's pattern).
export function useMyRangeOfMotion() {
  const { data: me } = useCurrentUser()
  return useQuery({
    queryKey: rangeOfMotionQueryKey(me?.id ?? 0),
    queryFn: () => fetchRangeOfMotion('mine'),
    enabled: me !== undefined,
  })
}

// One assessment — the version an amendment starts from.
export function useRomAssessment(patientId: number, assessmentId: number) {
  return useQuery({
    queryKey: romAssessmentQueryKey(patientId, assessmentId),
    queryFn: () => fetchRomAssessment(assessmentId),
  })
}

// Recording an assessment or an amendment. On success the list is marked
// stale: the page opened next reads it again — a new, audited read of what
// the practitioner then sees (the medical file's reasoning).
export function useRecordRomAssessment(patientId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createRomAssessment,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: rangeOfMotionQueryKey(patientId) }),
  })
}