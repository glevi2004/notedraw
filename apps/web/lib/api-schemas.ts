/**
 * Zod schemas for API request bodies.
 *
 * Use these to validate and narrow incoming JSON before any business logic.
 * TypeScript types are derived from the schemas so the frontend and backend
 * always agree on the shape without duplication.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Workspaces
// ---------------------------------------------------------------------------

export const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

// ---------------------------------------------------------------------------
// Scenes
// ---------------------------------------------------------------------------

export const createSceneSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  workspaceId: z.string().optional(),
  collectionId: z.string().nullable().optional(),
  content: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type CreateSceneInput = z.infer<typeof createSceneSchema>;

export const updateSceneSchema = z.object({
  title: z.string().min(1, "Title is required").max(255).optional(),
  collectionId: z.string().nullable().optional(),
  // content is intentionally untyped here — shape validation is handled
  // inside the scene PATCH handler after the 5 MB body-size check.
  content: z.unknown().optional(),
});

export type UpdateSceneInput = z.infer<typeof updateSceneSchema>;

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

export const createCollectionSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  workspaceId: z.string(),
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse a request body with a Zod schema.
 * Returns `{ success: true, data }` or `{ success: false, error }`.
 */
export function parseBody<T>(
  schema: z.ZodType<T>,
  body: unknown,
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(body);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const message = result.error.issues
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("; ");
  return { success: false, error: message || "Invalid request body" };
}
