import { useHealthCheck } from '@/common/useHealthCheck'
import { useLogout } from '@/auth/useLogout'
import { Button } from '@/components/ui/button'

export function DashboardPage() {
  const { data, isLoading, isError } = useHealthCheck()
  const logoutMutation = useLogout()

  return (
    <div>
      <h1>Dashboard (placeholder)</h1>
      {isLoading && <p>Checking backend…</p>}
      {isError && <p style={{ color: 'red' }}>Backend unreachable</p>}
      {data && <p style={{ color: 'green' }}>Backend status: {data.status}</p>}
      <Button
        onClick={() => logoutMutation.mutate()}
        disabled={logoutMutation.isPending}
      >
        {logoutMutation.isPending ? 'Logging out…' : 'Log out'}
      </Button>
    </div>
  )
}