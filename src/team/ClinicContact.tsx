import { formatAddressLines } from '@/common/address/format'
import type { Clinic } from '@/clinics/types'
import { useClinic } from '@/clinics/useClinic'
import type { ClinicRef } from '@/patients/types'
import { websiteHref } from './teamRules'

// One clinic of "Where they see you": its name, then how to reach it —
// address, phone, email, website. The CLINIC's details (public to any
// signed-in user, GET /clinics/:id), never the practitioner's own: the
// patient contacts their practitioner through the clinic (decided
// 2026-10-18). The name comes with the care-team entry, so it shows at once;
// the rest follows its own request, which a practitioner seen at two clinics
// makes twice (a handful at most — no list endpoint needed).
export function ClinicContact({ clinic }: { clinic: ClinicRef }) {
  const details = useClinic(clinic.id)
  return (
    <li className="space-y-1 rounded-lg border p-4">
      <h3 className="font-medium">{clinic.name}</h3>
      {details.isPending && <p className="text-sm text-muted-foreground">Loading the clinic's details…</p>}
      {details.isError && (
        <p className="text-sm text-muted-foreground">Couldn't load this clinic's contact details.</p>
      )}
      {details.data && <ContactLines clinic={details.data} />}
    </li>
  )
}

function ContactLines({ clinic }: { clinic: Clinic }) {
  const address = formatAddressLines(clinic)
  const href = clinic.website ? websiteHref(clinic.website) : null
  return (
    <div className="space-y-1 text-sm">
      {address.length > 0 && (
        // <address> is HTML's element for contact information.
        <address className="not-italic text-muted-foreground">
          {address.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </address>
      )}
      {/* tel: and mailto: make each one a tap away on a phone. Each link's
          visible text IS its value, so it needs no extra label. */}
      {clinic.phone && (
        <p>
          <a href={`tel:${clinic.phone}`} className="underline underline-offset-4">
            {clinic.phone}
          </a>
        </p>
      )}
      <p>
        <a href={`mailto:${clinic.email}`} className="break-all underline underline-offset-4">
          {clinic.email}
        </a>
      </p>
      {clinic.website && (
        <p className="break-all">
          {href ? (
            // A new tab: leaving for another site shouldn't lose the patient's
            // place here. `noreferrer` sends the site no Stride address (and
            // implies noopener — the opened page can't reach back into this
            // one through window.opener).
            <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-4">
              {clinic.website}
            </a>
          ) : (
            clinic.website
          )}
        </p>
      )}
    </div>
  )
}