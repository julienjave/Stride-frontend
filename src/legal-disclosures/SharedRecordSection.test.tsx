import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { json, urlOf } from '@/medical-files/testData'
import { expectSkeleton } from '@/common/loadingAssertions'
import { formatMomentDate } from '@/common/formatMomentDate'
import { SharedRecordSection } from './SharedRecordSection'
import type { OwnLegalDisclosure } from './types'

// "When your record was shared" on My records (decisions §25, pass 3): the
// patient's accounting of disclosures. The words are
// legalDisclosureRules.test.ts's; here, what the section shows.

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

function shared(id: number, extra: Partial<OwnLegalDisclosure> = {}): OwnLegalDisclosure {
  return {
    id,
    // Noon UTC: the same day in every zone the tests run in.
    madeAt: '2031-06-10T12:00:00.000Z',
    recipientName: 'Jane Roe',
    recipientOrganisation: 'Montreal Police',
    legalBasis: 'court_order',
    basisExplanation: null,
    parts: ['medical_file', 'messages'],
    periodFrom: '2031-03-01',
    periodTo: '2031-03-31',
    ...extra,
  }
}

let answer: () => Response | Promise<Response>
let paths: string[]

beforeEach(() => {
  paths = []
  answer = () => json([shared(21)])
  fetchMock.mockReset()
  fetchMock.mockImplementation((input) => {
    const url = new URL(urlOf(input))
    paths.push(url.pathname)
    return url.pathname === '/legal-disclosures'
      ? Promise.resolve(answer())
      : Promise.reject(new Error(`unexpected ${url.pathname}`))
  })
})

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <SharedRecordSection />
    </QueryClientProvider>,
  )
}

const region = () => screen.getByRole('region', { name: 'When your record was shared' })

describe('SharedRecordSection', () => {
  it('says what it lists, then each time: when, to whom, why, what, which period', async () => {
    answer = () =>
      json([
        shared(22, {
          madeAt: '2031-07-01T12:00:00.000Z',
          recipientOrganisation: null,
          legalBasis: 'other',
          basisExplanation: 'A tribunal order',
          parts: ['sessions'],
          periodFrom: null,
          periodTo: null,
        }),
        shared(21),
      ])
    renderSection()
    expect(
      within(region()).getByText(
        "When the law requires it — a court order, for example — a clinic may have to give a copy of a record to someone outside it without asking first. Each time that happened with your record is listed here. Copies you download yourself aren't.",
      ),
    ).toBeInTheDocument()
    const [newest, older] = within(
      await screen.findByRole('list', { name: 'Times your record was shared' }),
    ).getAllByRole('listitem')
    expect(newest).toHaveTextContent(`${formatMomentDate('2031-07-01T12:00:00.000Z')} · Jane Roe`)
    expect(newest).toHaveTextContent('Why: Another legal basis: A tribunal order')
    expect(newest).toHaveTextContent('What: Sessions')
    expect(newest).toHaveTextContent('Period: all dates')
    expect(older).toHaveTextContent(
      `${formatMomentDate('2031-06-10T12:00:00.000Z')} · Jane Roe (Montreal Police)`,
    )
    expect(older).toHaveTextContent('Why: A court order')
    expect(older).toHaveTextContent('What: Medical file and messages')
    expect(older).toHaveTextContent(
      `Period: ${new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date('2031-03-01T00:00:00Z'))} to`,
    )
    expect(paths).toEqual(['/legal-disclosures'])
  })

  it('says when there is none — after loading words, never during', async () => {
    let release!: (response: Response) => void
    answer = () => new Promise((resolve) => (release = resolve))
    renderSection()
    expectSkeleton('Loading when your record was shared…')
    expect(within(region()).queryByText(/hasn't been shared/)).not.toBeInTheDocument()
    release(json([]))
    expect(
      await within(region()).findByText("Your record hasn't been shared outside the clinic."),
    ).toBeInTheDocument()
    expect(within(region()).queryByRole('list')).not.toBeInTheDocument()
  })

  it('says when the list could not be loaded — and "Try again" asks again, focus to the heading', async () => {
    const user = userEvent.setup()
    answer = () => json({ statusCode: 500, message: ['Boom'], error: 'Error' }, 500)
    renderSection()
    expect(await within(region()).findByRole('alert')).toHaveTextContent(
      /^Couldn't load when your record was shared\./,
    )
    expect(within(region()).queryByText(/hasn't been shared/)).not.toBeInTheDocument()
    answer = () => json([])
    await user.click(within(region()).getByRole('button', { name: 'Try again' }))
    expect(
      await within(region()).findByText("Your record hasn't been shared outside the clinic."),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { level: 2, name: 'When your record was shared' }),
      ).toHaveFocus(),
    )
  })
})
