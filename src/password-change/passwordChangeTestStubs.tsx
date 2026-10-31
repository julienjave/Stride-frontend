import { EmailRow } from '@/email-change/EmailRow'

// The profile page, reduced to what these tests look at: its heading and the
// real Email row (to see a cancelled email change vanish). The confirmation
// is a snackbar, checked in the store (decisions §33).
// (Its own file: a component in a test-helper module that exports functions
// too fails react-refresh/only-export-components.)
export function ProfileStub() {
  return (
    <div>
      <h1>My profile</h1>
      <EmailRow email="pat@example.com" />
    </div>
  )
}