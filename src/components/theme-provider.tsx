'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { LucideProvider } from 'lucide-react'

type Theme = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: ResolvedTheme | undefined
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  setTheme: () => {},
  resolvedTheme: undefined,
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system'
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
    return 'system'
  })
  const [systemDark, setSystemDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  const isDark = theme === 'dark' || (theme === 'system' && systemDark)
  const resolvedTheme: ResolvedTheme | undefined =
    typeof window === 'undefined' ? undefined : (isDark ? 'dark' : 'light')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  function setTheme(next: Theme) {
    localStorage.setItem('theme', next)
    setThemeState(next)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      <LucideProvider strokeWidth={1.25}>
        {children}
      </LucideProvider>
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
