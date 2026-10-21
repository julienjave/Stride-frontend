// The medical file's addresses, written once (the shape of
// practitionerProfilePath.ts): a page that links to another and the route
// that matches it can't drift apart.

export function patientPagePath(patientId: number): string {
  return `/practitioner/patients/${patientId}`
}

export function medicalFilePath(patientId: number): string {
  return `${patientPagePath(patientId)}/medical-file`
}

// The entry page: a new entry, or — with `amendsId` — an amendment of that
// version (`?amends=`).
export function medicalFileEntryPath(patientId: number, amendsId?: number): string {
  const path = `${medicalFilePath(patientId)}/new`
  return amendsId === undefined ? path : `${path}?amends=${amendsId}`
}

export const MY_RECORDS_PATH = '/profile/records'