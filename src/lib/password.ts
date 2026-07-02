import { z } from 'zod'

// Pure, isomorphic password-reset validation (USER-003). Kept out of the client
// form component so it can be unit-tested directly. Mirrors the min-8 rule the
// registration form enforces, plus the confirm-match check unique to reset.

export const PASSWORD_MIN_LENGTH = 8

/** New-password + confirm for the reset form. The `.refine` surfaces a mismatch
 *  on the `confirm` field so the error renders under the second input. */
export const passwordResetSchema = z
  .object({
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  })
