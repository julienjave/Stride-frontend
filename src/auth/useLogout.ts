import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { logout } from './api'

// A hook (not just a plain function) specifically so it can use
// useMutation and useNavigate — both of these only work inside a React
// component or another hook, since they rely on React's context system
// under the hood.
export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      // queryClient.clear() wipes EVERY cached query, not just
      // currentUserQueryKey — deliberately more aggressive than the
      // setQueryData calls we used on login. On logout, nothing that was
      // cached (patient roster, exercise library, another user's messages)
      // should still be sitting in memory for whoever logs in next on this
      // same browser tab. Clearing everything is the safe default; scoping
      // it more narrowly would mean remembering to list every query key
      // that could possibly contain now-stale, no-longer-authorized data.
      queryClient.clear()
      void navigate('/login')
    },
  })
}