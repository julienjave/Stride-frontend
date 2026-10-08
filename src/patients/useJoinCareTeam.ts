import { useMutation, useQueryClient } from '@tanstack/react-query'
import { joinCareTeam } from './api'

// "Add to my patients" = join the patient's care team (decisions §3: my
// roster IS my care-team links — there's no separate "roster" record).
//
// After a successful join, two cached lists are out of date, and both are
// INVALIDATED (marked stale and refetched if on screen) rather than edited
// by hand:
//   - ['users-list'] — "My patients" (GET /users) now has one more patient.
//     The response is a care-team link, not a user, so there's nothing to
//     insert into that list directly.
//   - ['directory-patients'] — every cached search containing this patient
//     shows `onMyCareTeam: false`, which is now wrong. The prefix covers
//     all the search terms at once (see directoryPatientsQueryKey).
//
// Invalidating is the simpler, safer option when the server's answer isn't
// the shape the cache holds: one extra request, and the lists are exactly
// what the server says — no hand-written copy of the backend's rules.
//
// `onJoined` runs AFTER the lists are refreshed (the Promise.all is
// awaited: returning a promise from onSuccess keeps the mutation pending
// until it settles, so the button keeps saying "Adding…" until the screen
// can show the result).
//
// Why a parameter of the HOOK, not a callback passed to mutate(): the
// refreshed directory marks the patient `onMyCareTeam`, the row swaps its
// "Add" button for "In your patients", and that UNMOUNTS the dialog that
// called mutate(). TanStack Query runs mutate()'s callbacks only while the
// calling component is still subscribed (MutationObserver checks
// `hasListeners()`); callbacks given to useMutation() belong to the
// mutation itself and run regardless.
//
// Honest note, from reading the library (v5.104) and a mutation check:
// TODAY the mutate() version works too — those callbacks run in the same
// chain of microtasks that finishes the mutation, while the refreshed list
// reaches React on a later timer tick, so the dialog is still mounted when
// they fire. Moving the callback back into mutate() passes every test, and
// no test can tell the two apart. The hook-level version is kept because
// it doesn't depend on that internal ordering.
export function useJoinCareTeam(patientId: number, onJoined?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reason: string) => joinCareTeam(patientId, reason),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['users-list'] }),
        queryClient.invalidateQueries({ queryKey: ['directory-patients'] }),
      ])
      onJoined?.()
    },
  })
}