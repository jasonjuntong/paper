'use client'

import { useEffect, useState } from 'react'

function timeOfDay(hour: number): string {
  if (hour < 5) return 'evening'
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}

export function Greeting({ firstName }: { firstName: string | null }) {
  const [period, setPeriod] = useState<string | null>(null)

  useEffect(() => {
    setPeriod(timeOfDay(new Date().getHours()))
  }, [])

  const message = period
    ? firstName
      ? `Good ${period}, ${firstName}`
      : `Good ${period}`
    : firstName
      ? `Hello, ${firstName}`
      : 'Hello'

  return (
    <h1 className="font-serif text-2xl font-normal tracking-tight">
      {message}
    </h1>
  )
}
