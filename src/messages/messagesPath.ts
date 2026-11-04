/*
    Copyright 2026 Julien Javelaud

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
// -----------------------------------------------------------------------------------------------------------

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