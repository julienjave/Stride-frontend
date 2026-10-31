// Where the suite's servers live (decisions §34). Ports of their OWN, beside
// the development ones (backend 3000, Vite 5173, preview 4173): the suite can
// run while you develop, and never talks to your development backend.
export const API_URL = 'http://localhost:3100'
export const APP_URL = 'http://localhost:4174'

// Mailpit's web inbox and HTTP API — the SAME Mailpit as development (from
// the backend's docker-compose.yml): the e2e backend sends its emails there
// too. Tests find their own email by its unique address.
export const MAILPIT_URL = 'http://localhost:8025'

// (The backend folder's location: support/backendDir.ts.)
