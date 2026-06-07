import { cookies } from 'next/headers'
import { adminAuth } from './firebase/admin'

export const SESSION_COOKIE = '__session'
export const SESSION_MAX_AGE = 14 * 24 * 60 * 60 // 14 days in seconds

export async function getSession() {
  const cookieStore = await cookies()
  const cookie = cookieStore.get(SESSION_COOKIE)?.value
  if (!cookie) return null
  try {
    return await adminAuth.verifySessionCookie(cookie, true)
  } catch {
    return null
  }
}
