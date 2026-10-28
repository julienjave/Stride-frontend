import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router'
import { ProgramsPage } from './ProgramsPage'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import type { ProgramTemplate } from './types'
import type { AssignedProgram } from '@/assigned-programs/types'
import { errorResponse, expectLoadError, retryThenExpectFocusOn } from '@/common/loadFailureAssertions'
import { expectSkeleton } from '@/common/loadingAssertions'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

function setupFetchMock(config: {
  templates?: ProgramTemplate[]
  assignedPrograms?: AssignedProgram[]
  // The list's FIRST read fails (a 500); later reads work.
  templatesFailOnce?: boolean
  assignedFailOnce?: boolean
}) {
  let templateFailures = config.templatesFailOnce ? 1 : 0
  let assignedFailures = config.assignedFailOnce ? 1 : 0
  fetchMock.mockImplementation((input, init) => {
    const url = input as string
    const method = init?.method ?? 'GET'

    if (method === 'GET' && url.endsWith('/programs')) {
      if (templateFailures > 0) {
        templateFailures -= 1
        return Promise.resolve(errorResponse(500))
      }
      return Promise.resolve(jsonResponse(config.templates ?? []))
    }
    if (method === 'GET' && url.endsWith('/assigned-programs')) {
      if (assignedFailures > 0) {
        assignedFailures -= 1
        return Promise.resolve(errorResponse(500))
      }
      return Promise.resolve(jsonResponse(config.assignedPrograms ?? []))
    }
    return Promise.reject(new Error(`Unhandled fetch in test: ${url}`))
  })
}

function renderAt(
  path = '/practitioner/programs',
  currentUser: { id: number; activeRole: string } = {
    id: 7,
    activeRole: 'practitioner',
  },
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  queryClient.setQueryData(currentUserQueryKey, currentUser)
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/practitioner/programs" element={<ProgramsPage />} />
          <Route
            path="/practitioner/programs/templates/new"
            element={<div>New template page</div>}
          />
          <Route
            path="/practitioner/programs/templates/:id"
            element={<div>Template detail page</div>}
          />
          <Route
            path="/practitioner/programs/assigned/new"
            element={<div>New assigned program page</div>}
          />
          <Route
            path="/practitioner/programs/assigned/:id"
            element={<div>Assigned program detail page</div>}
          />
          <Route path="/practitioner" element={<div>Dashboard page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ProgramsPage', () => {
  it('shows the title, both toggle buttons, and Templates active by default', () => {
    setupFetchMock({})
    renderAt()
    expect(screen.getByText('My Programs')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Templates' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByRole('button', { name: 'Assigned' }),
    ).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows the "only my templates" checkbox for Templates, but not for Assigned', async () => {
    setupFetchMock({})
    const user = userEvent.setup()
    renderAt()
    expect(screen.getByLabelText('Only my templates')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Assigned' }))
    expect(
      screen.queryByLabelText('Only my templates'),
    ).not.toBeInTheDocument()
  })

  it('shows every template by default, not just the practitioner\'s own', async () => {
    setupFetchMock({
      templates: [
        { id: 1, practitionerId: 7, title: 'My Template', description: null, isArchived: false },
        { id: 2, practitionerId: 999, title: "Someone Else's Template", description: null, isArchived: false },
      ],
    })
    renderAt()

    expect(await screen.findByText('My Template')).toBeInTheDocument()
    expect(screen.getByText("Someone Else's Template")).toBeInTheDocument()
  })

  it('narrows to only own templates when the checkbox is checked', async () => {
    setupFetchMock({
      templates: [
        { id: 1, practitionerId: 7, title: 'My Template', description: null, isArchived: false },
        { id: 2, practitionerId: 999, title: "Someone Else's Template", description: null, isArchived: false },
      ],
    })
    const user = userEvent.setup()
    renderAt()
    await screen.findByText('My Template')

    await user.click(screen.getByLabelText('Only my templates'))

    expect(screen.getByText('My Template')).toBeInTheDocument()
    expect(
      screen.queryByText("Someone Else's Template"),
    ).not.toBeInTheDocument()
  })

  it('marks only the current user\'s own templates with a "Yours" badge', async () => {
    setupFetchMock({
      templates: [
        { id: 1, practitionerId: 7, title: 'My Template', description: null, isArchived: false },
        { id: 2, practitionerId: 999, title: "Someone Else's Template", description: null, isArchived: false },
      ],
    })
    renderAt()

    const mine = (await screen.findByText('My Template')).closest('a')!
    const theirs = screen.getByText("Someone Else's Template").closest('a')!
    expect(within(mine).getByText('Yours')).toBeInTheDocument()
    expect(within(theirs).queryByText('Yours')).not.toBeInTheDocument()
  })

  it('does not badge assigned programs — every one listed is already the user\'s own', async () => {
    setupFetchMock({
      assignedPrograms: [
        {
          id: 1,
          patientId: 50,
          assignedBy: 7,
          basedOnTemplateId: null,
          title: 'My Assignment',
          startDate: '2026-01-01',
          endDate: null,
          status: 'active',
          isArchived: false,
          basedOnProgramId: null,
          allowSwaps: true,
          lateMakeUpDays: null,
          schedules: [],
        },
      ],
    })
    const user = userEvent.setup()
    renderAt()
    await user.click(screen.getByRole('button', { name: 'Assigned' }))

    await screen.findByText('My Assignment')
    expect(screen.queryByText('Yours')).not.toBeInTheDocument()
  })

  it('always filters Assigned Programs to ones the current user assigned, with no toggle needed', async () => {
    setupFetchMock({
      assignedPrograms: [
        {
          id: 1,
          patientId: 50,
          assignedBy: 7,
          basedOnTemplateId: null,
          title: 'My Assignment',
          startDate: '2026-01-01',
          endDate: null,
          status: 'active',
          isArchived: false,
          basedOnProgramId: null,
          allowSwaps: true,
          lateMakeUpDays: null,
          schedules: [],
        },
        {
          id: 2,
          patientId: 50,
          assignedBy: 999,
          basedOnTemplateId: null,
          title: "Colleague's Assignment for the same patient",
          startDate: '2026-01-01',
          endDate: null,
          status: 'active',
          isArchived: false,
          basedOnProgramId: null,
          allowSwaps: true,
          lateMakeUpDays: null,
          schedules: [],
        },
      ],
    })
    const user = userEvent.setup()
    renderAt()
    await user.click(screen.getByRole('button', { name: 'Assigned' }))

    expect(await screen.findByText('My Assignment')).toBeInTheDocument()
    expect(
      screen.queryByText("Colleague's Assignment for the same patient"),
    ).not.toBeInTheDocument()
  })

  it('the Add card is always first and links to template creation when Templates is active', async () => {
    setupFetchMock({
      templates: [
        { id: 1, practitionerId: 7, title: 'My Template', description: null, isArchived: false },
      ],
    })
    renderAt()
    await screen.findByText('My Template')

    const links = screen.getAllByRole('link')
    expect(links[0]).toHaveAttribute(
      'href',
      '/practitioner/programs/templates/new',
    )
    expect(links[0]).toHaveTextContent('Add New Template')
  })

  it('the Add card links to assigned-program creation when Assigned is active', async () => {
    setupFetchMock({})
    const user = userEvent.setup()
    renderAt()
    await user.click(screen.getByRole('button', { name: 'Assigned' }))

    const addLink = await screen.findByText('+ Assign a program')
    expect(addLink).toHaveAttribute(
      'href',
      '/practitioner/programs/assigned/new',
    )
  })

  it('clicking a template navigates to its own detail route', async () => {
    setupFetchMock({
      templates: [
        { id: 5, practitionerId: 7, title: 'My Template', description: null, isArchived: false },
      ],
    })
    const user = userEvent.setup()
    renderAt()
    await user.click(await screen.findByText('My Template'))

    expect(
      await screen.findByText('Template detail page'),
    ).toBeInTheDocument()
  })

  it('clicking an assigned program navigates to its own detail route', async () => {
    setupFetchMock({
      assignedPrograms: [
        {
          id: 9,
          patientId: 50,
          assignedBy: 7,
          basedOnTemplateId: null,
          title: 'My Assignment',
          startDate: '2026-01-01',
          endDate: null,
          status: 'active',
          isArchived: false,
          basedOnProgramId: null,
          allowSwaps: true,
          lateMakeUpDays: null,
          schedules: [],
        },
      ],
    })
    const user = userEvent.setup()
    renderAt()
    await user.click(screen.getByRole('button', { name: 'Assigned' }))
    await user.click(await screen.findByText('My Assignment'))

    expect(
      await screen.findByText('Assigned program detail page'),
    ).toBeInTheDocument()
  })

  it('shows an empty-state message distinct from the Add card when there are no templates', async () => {
    setupFetchMock({ templates: [] })
    renderAt()
    expect(await screen.findByText('No templates yet.')).toBeInTheDocument()
    expect(screen.getByText('+ Add New Template')).toBeInTheDocument()
  })

  it('templates fail to load: the load error; a retry that works focuses the heading', async () => {
    const user = userEvent.setup()
    setupFetchMock({ templatesFailOnce: true })
    renderAt()
    await expectLoadError('the templates')
    await retryThenExpectFocusOn(user, { level: 1, name: 'My Programs' })
    expect(await screen.findByText('No templates yet.')).toBeInTheDocument()
  })

  it("the Assigned tab's own failure, and its Try again asks only that list again", async () => {
    const user = userEvent.setup()
    setupFetchMock({ assignedFailOnce: true })
    renderAt()
    await user.click(screen.getByRole('button', { name: 'Assigned' }))
    await expectLoadError('your assigned programs')
    const asked = (path: string) =>
      fetchMock.mock.calls.filter(([input]) => (input as string).endsWith(path)).length
    const templatesBefore = asked('/programs')
    await retryThenExpectFocusOn(user, { level: 1, name: 'My Programs' })
    expect(asked('/assigned-programs')).toBe(2)
    expect(asked('/programs')).toBe(templatesBefore)
  })

  it('the Back button links to the practitioner dashboard', async () => {
    setupFetchMock({})
    renderAt()
    const user = userEvent.setup()
    await user.click(screen.getByRole('link', { name: 'Back' }))
    expect(await screen.findByText('Dashboard page')).toBeInTheDocument()
  })
})

// Lists load behind a skeleton (the loading / error pass, pass 2).
describe('ProgramsPage — while it loads', () => {
  it('a skeleton of the templates, then of the assigned programs', async () => {
    fetchMock.mockImplementation(() => new Promise<Response>(() => {}))
    renderAt()
    expectSkeleton('Loading the templates…')
    await userEvent.click(screen.getByRole('button', { name: 'Assigned' }))
    expectSkeleton('Loading your assigned programs…')
  })
})