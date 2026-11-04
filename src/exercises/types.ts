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

// Hand-written, like every response type in the app: these endpoints have
// no @ApiResponse decorator backend-side, so the OpenAPI generator the
// project once had (openapi-typescript, removed 2026-10-20 — nothing used
// its output) produced their 200 responses as content?: never, an unusable
// empty type. This models what they actually return, checked against live
// responses.

export interface ExerciseAuthor {
  firstName: string
  lastName: string
}

export interface ExerciseImage {
  objectKey: string
  url: string
}

// The shape GET /exercises (the LIST endpoint) returns for each row.
// coverUrl is the cover photo's (the first photo's) signed URL for the
// card's thumbnail, or null when the exercise has no photo. Only the cover
// is signed — a card shows one picture; ExerciseDetail below carries the
// whole gallery. The URL stays the same for an hour (the backend's
// getCacheablePresignedUrl), so the browser can reuse the picture when the
// list is fetched again. No storage keys here (the list sent the raw
// `mediaUrls` until Phase 7's thumbnails).
export interface ExerciseListItem {
  id: number
  externalId: string | null
  name: string
  primaryMuscles: string[]
  secondaryMuscles: string[]
  equipment: string[]
  instructions: string[]
  coverUrl: string | null
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