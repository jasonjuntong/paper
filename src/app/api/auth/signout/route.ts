import { type NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE } from '@/lib/session'

// Called by the app layout when an expired/invalid session cookie is detected.
// Clears the stale cookie then redirects to /login, breaking the proxy loop.
export function GET(request: NextRequest) {
  // Reject cross-origin requests to prevent force-logout via embedded resources.
  // 'none' = direct navigation / server-side redirect (our case); 'same-origin' = same-site client nav.
  const fetchSite = request.headers.get('sec-fetch-site')
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
    return new NextResponse(null, { status: 403 })
  }

  const response = NextResponse.redirect(new URL('/login', request.url))
  response.cookies.set(SESSION_COOKIE, '', { maxAge: 0, path: '/' })
  return response
}
