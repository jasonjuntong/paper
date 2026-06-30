import { describe, it, expect } from 'vitest'
import {
  HANDLE_MAX_LENGTH,
  HANDLE_MIN_LENGTH,
  HandleTakenError,
  RESERVED_HANDLES,
  handleSchema,
  normalizeHandle,
} from '@/lib/handles'

const isValid = (h: string) => handleSchema.safeParse(h).success

describe('normalizeHandle', () => {
  it('lowercases the handle (the uniqueness key)', () => {
    expect(normalizeHandle('AliceB')).toBe('aliceb')
  })

  it('maps case variants to the same key, so they collide', () => {
    expect(normalizeHandle('Alice')).toBe(normalizeHandle('alice'))
    expect(normalizeHandle('ALICE')).toBe(normalizeHandle('alice'))
  })

  it('leaves an already-lowercase handle unchanged', () => {
    expect(normalizeHandle('alice')).toBe('alice')
  })
})

describe('handleSchema — length', () => {
  it(`rejects shorter than ${HANDLE_MIN_LENGTH}`, () => {
    expect(isValid('ab')).toBe(false)
  })

  it(`accepts exactly ${HANDLE_MIN_LENGTH}`, () => {
    expect(isValid('a'.repeat(HANDLE_MIN_LENGTH))).toBe(true)
  })

  it(`accepts exactly ${HANDLE_MAX_LENGTH}`, () => {
    expect(isValid('a'.repeat(HANDLE_MAX_LENGTH))).toBe(true)
  })

  it(`rejects longer than ${HANDLE_MAX_LENGTH}`, () => {
    expect(isValid('a'.repeat(HANDLE_MAX_LENGTH + 1))).toBe(false)
  })
})

describe('handleSchema — allowed characters', () => {
  it('accepts letters, digits, and mixed case', () => {
    expect(isValid('Alice123')).toBe(true)
  })

  it('accepts allowed special characters', () => {
    expect(isValid('ab_c.dev!')).toBe(true)
    expect(isValid('a-b+c~d')).toBe(true)
  })
})

describe('handleSchema — leading character', () => {
  it('accepts a handle starting with a letter', () => {
    expect(isValid('abc')).toBe(true)
    expect(isValid('Zoe9')).toBe(true)
  })

  it('rejects a leading digit', () => {
    expect(isValid('1abc')).toBe(false)
    expect(isValid('123')).toBe(false)
  })

  it('rejects a leading special character', () => {
    expect(isValid('_abc')).toBe(false)
    expect(isValid('.abc')).toBe(false)
    expect(isValid('-abc')).toBe(false)
  })

  it('allows digits and special characters after the first letter', () => {
    expect(isValid('a1_')).toBe(true)
    expect(isValid('z.9-x')).toBe(true)
  })
})

describe('handleSchema — rejected characters', () => {
  it('rejects whitespace', () => {
    expect(isValid('a b')).toBe(false)
    expect(isValid('a\tb')).toBe(false)
  })

  it('rejects the / doc-id delimiter', () => {
    expect(isValid('a/b')).toBe(false)
  })

  it('rejects HTML/JS-injection characters', () => {
    for (const c of ['<', '>', '&', '"', "'", '`']) {
      expect(isValid(`ab${c}cd`), `char ${c}`).toBe(false)
    }
  })

  it('rejects non-ASCII (homoglyph guard)', () => {
    expect(isValid('café')).toBe(false)
    expect(isValid('日本語')).toBe(false)
    expect(isValid('аdmin')).toBe(false) // Cyrillic 'а'
  })
})

describe('handleSchema — reserved blocklist', () => {
  it('rejects every reserved handle', () => {
    for (const reserved of RESERVED_HANDLES) {
      expect(isValid(reserved), `reserved ${reserved}`).toBe(false)
    }
  })

  it('rejects reserved handles case-insensitively', () => {
    expect(isValid('Admin')).toBe(false)
    expect(isValid('ADMIN')).toBe(false)
    expect(isValid('ApI')).toBe(false)
  })

  it('allows a non-reserved handle that merely contains a reserved word', () => {
    expect(isValid('admins')).toBe(true)
    expect(isValid('helper')).toBe(true)
  })
})

describe('HandleTakenError', () => {
  it('has the expected name', () => {
    expect(new HandleTakenError().name).toBe('HandleTakenError')
  })

  it('includes the handle in the message when given', () => {
    expect(new HandleTakenError('alice').message).toContain('alice')
  })

  it('is an instance of Error', () => {
    expect(new HandleTakenError()).toBeInstanceOf(Error)
  })
})
