import { describe, it, expect } from 'vitest'
import {
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
  accountUpdateSchema,
} from '@/lib/account'

const parse = (input: unknown) => accountUpdateSchema.safeParse(input)

const errorFor = (result: ReturnType<typeof parse>, field: 'name' | 'notificationEmail') =>
  result.success ? undefined : result.error.flatten().fieldErrors[field]?.[0]

describe('accountUpdateSchema — accepted shapes', () => {
  it('accepts a name-only update', () => {
    expect(parse({ name: 'Ada Lovelace' }).success).toBe(true)
  })

  it('accepts a notificationEmail-only update (true and false)', () => {
    expect(parse({ notificationEmail: true }).success).toBe(true)
    expect(parse({ notificationEmail: false }).success).toBe(true)
  })

  it('accepts both fields together', () => {
    expect(parse({ name: 'Ada', notificationEmail: false }).success).toBe(true)
  })

  it('trims surrounding whitespace from the name', () => {
    const result = parse({ name: '  Ada Lovelace  ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.name).toBe('Ada Lovelace')
  })
})

describe('accountUpdateSchema — name bounds', () => {
  it(`rejects a name shorter than ${NAME_MIN_LENGTH} characters`, () => {
    const result = parse({ name: 'a' })
    expect(result.success).toBe(false)
    expect(errorFor(result, 'name')).toMatch(/at least/)
  })

  it('rejects a name that is only whitespace (trims below the minimum)', () => {
    const result = parse({ name: '   ' })
    expect(result.success).toBe(false)
    expect(errorFor(result, 'name')).toMatch(/at least/)
  })

  it(`accepts a name of exactly ${NAME_MIN_LENGTH} characters`, () => {
    expect(parse({ name: 'Jo' }).success).toBe(true)
  })

  it(`rejects a name longer than ${NAME_MAX_LENGTH} characters`, () => {
    const result = parse({ name: 'x'.repeat(NAME_MAX_LENGTH + 1) })
    expect(result.success).toBe(false)
    expect(errorFor(result, 'name')).toMatch(/at most/)
  })

  it(`accepts a name of exactly ${NAME_MAX_LENGTH} characters`, () => {
    expect(parse({ name: 'x'.repeat(NAME_MAX_LENGTH) }).success).toBe(true)
  })
})

describe('accountUpdateSchema — type and empty-body guards', () => {
  it('rejects a non-boolean notificationEmail', () => {
    expect(parse({ notificationEmail: 'yes' }).success).toBe(false)
  })

  it('rejects an empty body — nothing to update', () => {
    const result = parse({})
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message === 'Nothing to update')).toBe(true)
    }
  })
})
