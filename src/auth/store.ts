import { create } from 'zustand'

// The full user object shape the backend returns from /auth/me, /auth/login,
// etc. Kept intentionally minimal here — we'll expand this once we build
// the actual login flow and know exactly which fields each screen needs
// (patientProfile, adminProfile, etc. are role-specific and attached
// conditionally by the backend).
export interface CurrentUser {
  id: number
  email: string
  firstName: string
  lastName: string
  roles: string[]
  activeRole: string
}

interface AuthState {
  // undefined = "haven't checked yet" (app just loaded, /auth/me hasn't
  // resolved). null = "checked, and there's no one logged in." These are
  // deliberately different values, not both squashed into null — a screen
  // needs to tell "still loading" apart from "definitely logged out" to
  // avoid a flash of a login screen before the real check even ran.
  user: CurrentUser | null | undefined
  setUser: (user: CurrentUser | null) => void
}

// create() from Zustand takes a function that receives `set` (the only way
// to update state) and returns the initial state + actions together, all
// in one object — no separate reducer/action-type boilerplate the way
// Redux would need.
export const useAuthStore = create<AuthState>((set) => ({
  user: undefined,
  setUser: (user) => set({ user }),
}))