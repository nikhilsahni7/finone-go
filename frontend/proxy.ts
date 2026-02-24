import { NextRequest, NextResponse } from "next/server";

// Skip static assets and internal paths
function isInternalPath(pathname: string): boolean {
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/favicon")
  ) {
    return true;
  }
  if (/\.(?:css|js|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|map)$/.test(pathname)) {
    return true;
  }
  return false;
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Skip for static assets
  if (isInternalPath(path)) {
    return NextResponse.next();
  }

  // Get both tokens
  const adminToken = request.cookies.get("admin_token")?.value;
  const userToken = request.cookies.get("token")?.value;

  // Handle admin routes separately
  if (path.startsWith("/admin")) {
    const isAdminLogin = path === "/admin/login";

    if (isAdminLogin && adminToken) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }

    if (!isAdminLogin && !adminToken) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    return NextResponse.next();
  }

  // Handle home page "/" - redirect to dashboard if logged in
  if (path === "/") {
    if (adminToken) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    if (userToken) {
      return NextResponse.redirect(new URL("/user/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // If trying to access user login and already authenticated
  if (path === "/user/login") {
    if (adminToken) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    if (userToken) {
      return NextResponse.redirect(new URL("/user/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Register page is public
  if (path === "/register") {
    return NextResponse.next();
  }

  // Protected user routes - require token
  if (path.startsWith("/user") && !userToken) {
    return NextResponse.redirect(new URL("/user/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/user/:path*",
    "/register",
  ],
};
