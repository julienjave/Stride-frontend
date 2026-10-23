import { useLocation } from 'react-router'
import { readNotice } from '@/common/readNotice'
import { EmailRow } from '@/email-change/EmailRow'

// The profile page, reduced to what these tests look at: the notice it was
// handed and the real Email row (to see a cancelled email change vanish).
// (Its own file: a component in a test-helper module that exports functions
// too fails react-refresh/only-export-components.)
export function ProfileStub() {
  const notice = readNotice(useLocation().state)
  return (
    <div>
      <h1>My profile</h1>
      {notice && <p role="status">{notice}</p>}
      <EmailRow email="pat@example.com" />
    </div>
  )
}