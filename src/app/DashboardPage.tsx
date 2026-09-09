import { useHealthCheck } from '@/common/useHealthCheck'

export function DashboardPage() {
  // Carried over from our Phase 0 verification — kept here rather than
  // deleted outright, since it's a genuinely useful "is the backend up"
  // signal to glance at. We'll likely move or remove this once there's
  // real dashboard content to replace it.
  const { data, isLoading, isError } = useHealthCheck()

  return (
    <div>
      <h1>Dashboard (placeholder)</h1>
      {isLoading && <p>Checking backend…</p>}
      {isError && <p style={{ color: 'red' }}>Backend unreachable</p>}
      {data && <p style={{ color: 'green' }}>Backend status: {data.status}</p>}
    </div>
  )
}