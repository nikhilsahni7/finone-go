import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Get the pathname of the request (e.g. /, /protected)
  const path = request.nextUrl.pathname

  // Get the token from the cookies
  const token = request.cookies.get('token')?.value

  // Define public paths that don't require authentication
  const isPublicPath = path === '/' || path === '/user/login'

  // If the path is public and user is authenticated, redirect to dashboard
  if (isPublicPath && token) {
    return NextResponse.redirect(new URL('/user/dashboard', request.url))
  }

  // If the path is protected and user is not authenticated, redirect to login
  if (!isPublicPath && !token) {
    return NextResponse.redirect(new URL('/user/login', request.url))
  }

  return NextResponse.next()
}

// Configure which paths should be protected
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
