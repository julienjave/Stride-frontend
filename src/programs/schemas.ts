import { z } from 'zod'

// Mirrors CreateTemplateDto exactly (programs/dto/create-template.dto.ts)
// — same reasoning as every other frontend schema in this codebase: the
// backend is the actual authority on what's valid, this just gives
// immediate inline feedback for the same rules.
export const createTemplateSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or fewer'),
  description: z
    .string()
    .max(2000, 'Description must be 2000 characters or fewer')
    .optional(),
})

export type CreateTemplateFormValues = z.infer<typeof createTemplateSchema>