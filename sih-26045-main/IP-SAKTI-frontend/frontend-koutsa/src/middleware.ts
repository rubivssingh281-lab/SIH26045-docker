import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/auth/login", "/auth/register", "/auth/verify"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(path => pathname.startsWith(path));
  const token = request.cookies.get("ip_sakti_session")?.value;

  if (isPublic) {
    if (token && pathname.startsWith("/auth/login")) return NextResponse.redirect(new URL("/dashboard", request.url));
    return NextResponse.next();
  }

  const protectedRoute = pathname.startsWith("/dashboard") || pathname.startsWith("/cases") || pathname.startsWith("/profile");
  if (protectedRoute && !token) {
    const url = new URL("/auth/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/cases/:path*", "/profile/:path*", "/auth/login", "/auth/register", "/auth/verify"]
};
