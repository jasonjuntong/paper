// Global setup for the default (jsdom) test lane.
// - Registers @testing-library/jest-dom matchers (toBeInTheDocument, etc.).
// - Unmounts rendered components after each test to keep the DOM clean.
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})
