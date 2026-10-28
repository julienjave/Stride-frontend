import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { ClinicsListPage } from './ClinicsListPage'
import { errorResponse, expectLoadError, retryThenExpectFocusOn } from '@/common/loadFailureAssertions'
import { expectSkeleton } from '@/common/loadingAssertions'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

function renderClinicsListPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/clinics']}>
        <ClinicsListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ClinicsListPage', () => {
  it('shows a loading state before the clinics resolve', () => {
    fetchMock.mockReturnValue(new Promise(() => {})) // never resolves
    renderClinicsListPage()
    expectSkeleton('Loading the clinics…')
  })

  it('renders each clinic with a link to its detail/edit view', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify([
          { id: 1, name: 'Acme Clinic', email: 'acme@example.com' },
          { id: 2, name: 'Beta Clinic', email: 'beta@example.com' },
        ]),
        { status: 200 },
      ),
    )
    renderClinicsListPage()

    expect(await screen.findByText('Acme Clinic')).toBeInTheDocument()
    expect(screen.getByText('acme@example.com')).toBeInTheDocument()
    expect(screen.getByText('Beta Clinic')).toBeInTheDocument()

    expect(screen.getByRole('link', { name: /Acme Clinic/ })).toHaveAttribute(
      'href',
      '/admin/clinics/1',
    )
    expect(screen.getByRole('link', { name: /Beta Clinic/ })).toHaveAttribute(
      'href',
      '/admin/clinics/2',
    )
  })

  it('shows an empty state when there are no active clinics', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }))
    renderClinicsListPage()
    expect(await screen.findByText('No clinics yet.')).toBeInTheDocument()
  })

  it('a failed load: the load error with its reason; a retry that works focuses the heading', async () => {
    const user = userEvent.setup()
    fetchMock
      .mockResolvedValueOnce(errorResponse(500))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
    renderClinicsListPage()
    await expectLoadError('the clinics')
    await retryThenExpectFocusOn(user, { level: 1, name: 'Clinics' })
    expect(await screen.findByText('No clinics yet.')).toBeInTheDocument()
  })

  it('has an "Add clinic" link pointing to the create route', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }))
    renderClinicsListPage()
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(screen.getByRole('link', { name: 'Add clinic' })).toHaveAttribute(
      'href',
      '/admin/clinics/new',
    )
  })

  it('refetches with includeInactive=true when the toggle is checked', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }))
    const user = userEvent.setup()
    renderClinicsListPage()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock.mock.calls[0][0]).not.toContain('includeInactive')

    await user.click(screen.getByRole('checkbox', { name: 'Show deactivated clinics' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('includeInactive=true'),
        expect.anything(),
      ),
    )
  })
})