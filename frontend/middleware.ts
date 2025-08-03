import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // Get the pathname of the request (e.g. /, /protected)
  const path = request.nextUrl.pathname;

  // Skip middleware for static assets
  if (path.match(/\.(png|jpg|jpeg|gif|svg|css|js|ico|woff|woff2|ttf|eot)$/)) {
    return NextResponse.next();
  }

  // Get both tokens
  const adminToken = request.cookies.get("admin_token")?.value;
  const userToken = request.cookies.get("token")?.value;

  // Handle admin routes separately
  if (path.startsWith("/admin")) {
    const isAdminLogin = path === "/admin/login";

    // If trying to access admin login and already authenticated, redirect to admin dashboard
    if (isAdminLogin && adminToken) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }

    // If trying to access protected admin routes without token, redirect to admin login
    if (!isAdminLogin && !adminToken) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    return NextResponse.next();
  }

  // Define public paths that don't require authentication
  const isPublicPath = path === "/" || path === "/user/login";

  // Handle home page "/" - check admin first, then user
  if (path === "/") {
    if (adminToken) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    if (userToken) {
      return NextResponse.redirect(new URL("/user/dashboard", request.url));
    }
    // If no tokens, stay on home page
    return NextResponse.next();
  }

  // If trying to access user login and already authenticated, redirect to appropriate dashboard
  if (path === "/user/login") {
    if (adminToken) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    if (userToken) {
      return NextResponse.redirect(new URL("/user/dashboard", request.url));
    }
    // If no tokens, stay on login page
    return NextResponse.next();
  }

  // If the path is protected and user is not authenticated, redirect to login
  if (!isPublicPath && !userToken) {
    return NextResponse.redirect(new URL("/user/login", request.url));
  }

  return NextResponse.next();
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
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
