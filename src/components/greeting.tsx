'use client'

import { useSyncExternalStore } from 'react'

function timeOfDay(hour: number): string {
  if (hour < 5) return 'evening'
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}

const subscribe = () => () => {}
const getPeriod = () => timeOfDay(new Date().getHours())
const getServerPeriod = () => null

export function Greeting({ firstName }: { firstName: string | null }) {
  const period = useSyncExternalStore<string | null>(
    subscribe,
    getPeriod,
    getServerPeriod
  )

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
