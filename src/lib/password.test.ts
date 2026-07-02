import { describe, it, expect } from 'vitest'
import { PASSWORD_MIN_LENGTH, passwordResetSchema } from '@/lib/password'

const parse = (password: string, confirm: string) =>
  passwordResetSchema.safeParse({ password, confirm })

// Reads the first error for a given field path, or undefined if that field is ok.
const errorFor = (result: ReturnType<typeof parse>, field: 'password' | 'confirm') =>
  result.success ? undefined : result.error.flatten().fieldErrors[field]?.[0]

describe('passwordResetSchema — length', () => {
  it(`rejects a password shorter than ${PASSWORD_MIN_LENGTH}`, () => {
    const pw = 'a'.repeat(PASSWORD_MIN_LENGTH - 1)
    const result = parse(pw, pw)
    expect(result.success).toBe(false)
    expect(errorFor(result, 'password')).toMatch(/at least/)
  })

  it(`accepts a password of exactly ${PASSWORD_MIN_LENGTH}`, () => {
    const pw = 'a'.repeat(PASSWORD_MIN_LENGTH)
    expect(parse(pw, pw).success).toBe(true)
  })
})

describe('passwordResetSchema — confirm match', () => {
  it('rejects when the two fields differ', () => {
    const result = parse('password123', 'password124')
    expect(result.success).toBe(false)
    expect(errorFor(result, 'confirm')).toBe('Passwords do not match')
  })

  it('reports the mismatch on the confirm field, not password', () => {
    const result = parse('password123', 'nope-different')
    expect(errorFor(result, 'password')).toBeUndefined()
    expect(errorFor(result, 'confirm')).toBe('Passwords do not match')
  })

  it('accepts matching passwords that meet the length rule', () => {
    expect(parse('password123', 'password123').success).toBe(true)
  })

  it('flags length before match when the password is both short and mismatched', () => {
    // A too-short password fails its own rule regardless of confirm.
    const result = parse('short', 'different')
    expect(result.success).toBe(false)
    expect(errorFor(result, 'password')).toMatch(/at least/)
  })
})
