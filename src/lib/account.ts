import { z } from 'zod'

// Pure, isomorphic validation for the account-settings update route (USER-005).
// Kept out of the route handler so it can be unit-tested directly (mirrors how
// password.ts extracts passwordResetSchema).

export const NAME_MIN_LENGTH = 2
export const NAME_MAX_LENGTH = 100

/** Partial profile/preference update. Both fields are optional, but at least one
 *  must be present — an empty body has nothing to apply and is rejected. */
export const accountUpdateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(NAME_MIN_LENGTH, `Name must be at least ${NAME_MIN_LENGTH} characters`)
      .max(NAME_MAX_LENGTH, `Name must be at most ${NAME_MAX_LENGTH} characters`)
      .optional(),
    notificationEmail: z.boolean().optional(),
  })
  .refine((data) => data.name !== undefined || data.notificationEmail !== undefined, {
    message: 'Nothing to update',
  })
