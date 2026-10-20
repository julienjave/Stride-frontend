// Where a role's Messages section lives — the same pages serve both roles,
// under each role's own prefix (so the tab of that role stays highlighted,
// and RequireRole guards each branch of the route tree).
export type MessagingRole = 'practitioner' | 'patient'

export function messagesPath(role: MessagingRole): string {
  return role === 'practitioner' ? '/practitioner/messages' : '/patient/messages'
}

export function conversationPath(role: MessagingRole, conversationId: number): string {
  return `${messagesPath(role)}/${conversationId}`
}

// The roles that have messaging at all (decided 2026-10-20: admins read no
// messages). A type guard: inside `if (isMessagingRole(role))` TypeScript
// knows `role` is one of the two.
export function isMessagingRole(role: string): role is MessagingRole {
  return role === 'practitioner' || role === 'patient'
}