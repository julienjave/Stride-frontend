// The invitation shapes the backend returns (src/invitations/ on the
// backend). Accounts are created by invitation: the account exists at once,
// without a password, and the person chooses theirs by accepting the
// emailed invitation.

// Derived by the backend from the invitation's timestamps — never stored.
export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired'

export interface PersonRef {
  id: number
  firstName: string
  lastName: string
}

// One invitation, as GET and POST /users/:id/invitations return it.
// Dates arrive as ISO strings (JSON has no date type).
export interface InvitationSummary {
  id: number
  status: InvitationStatus
  createdAt: string
  expiresAt: string
  acceptedAt: string | null
  revokedAt: string | null
  // When the mail server accepted the invitation email; null = it couldn't
  // be sent, so the person hasn't received the link.
  emailSentAt: string | null
  invitedBy: PersonRef
  revokedBy: PersonRef | null
}

// POST /users/:id/invitations: the new invitation, plus whether its email
// actually went out. false is not an error — the invitation exists, and
// can be sent again.
export interface SentInvitation extends InvitationSummary {
  emailSent: boolean
}

// The first invitation, as POST /users reports it alongside the new account.
export interface CreatedUserInvitation {
  id: number
  status: InvitationStatus
  expiresAt: string
  emailSent: boolean
}

// POST /invitations/lookup: what the accept page needs to greet the person
// — nothing it could use to sign in. Public: the person has no session yet.
export interface InvitationPreview {
  email: string
  firstName: string
  lastName: string
  clinicNames: string[]
  expiresAt: string
}

// Why an invitation can't be used any more: the `reason` field of the
// backend's 410 Gone (a 404 means the link doesn't exist at all).
export type UnusableReason = 'accepted' | 'revoked' | 'expired' | 'deactivated'