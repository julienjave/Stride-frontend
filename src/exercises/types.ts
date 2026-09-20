// Hand-written, not generated — same gap CurrentUser (auth/types.ts) and
// RegisterClinicResult already work around: these endpoints have no
// @ApiResponse decorator backend-side, so openapi-typescript generates
// their 200 responses as content?: never, an unusable empty type. This
// models what they actually return instead.

export interface ExerciseAuthor {
  firstName: string
  lastName: string
}

export interface ExerciseImage {
  objectKey: string
  url: string
}

// The shape GET /exercises (the LIST endpoint) returns for each row.
// mediaUrls stays a raw, non-displayable array of storage keys here —
// ExercisesService.findAll deliberately does NOT convert these to signed
// URLs, since the Library browse cards always show a placeholder
// thumbnail regardless (see ExerciseCard's own comment); paying for
// presigned-URL generation on every row of every page would have no
// payoff today. Contrast with ExerciseDetail below, which DOES.
export interface ExerciseListItem {
  id: number
  externalId: string | null
  name: string
  primaryMuscles: string[]
  secondaryMuscles: string[]
  equipment: string[]
  instructions: string[]
  mediaUrls: string[]
  source: 'api' | 'custom'
  createdBy: number | null
  isArchived: boolean
  author: ExerciseAuthor | null
}

// The shape every SINGLE-exercise endpoint returns (POST /exercises,
// GET/PATCH /exercises/:id, and all three /:id/images routes) — images
// (not mediaUrls) pairs each raw object key with a ready-to-use signed
// url, via ExercisesService.withImages. This is deliberately a SEPARATE
// interface from ExerciseListItem above, not the same one with an
// optional field either way — they reflect two genuinely different real
// backend response shapes, and collapsing them into one type would make
// it lie about which field is actually present depending on which
// endpoint returned it.
export interface ExerciseDetail {
  id: number
  externalId: string | null
  name: string
  primaryMuscles: string[]
  secondaryMuscles: string[]
  equipment: string[]
  instructions: string[]
  images: ExerciseImage[]
  source: 'api' | 'custom'
  createdBy: number | null
  isArchived: boolean
  author: ExerciseAuthor | null
}

export interface ExercisesPage {
  data: ExerciseListItem[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}