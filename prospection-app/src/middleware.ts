import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PREFIXES = ["/login", "/demo", "/_next", "/favicon", "/api/health"];

function isPublic(pathname: string): boolean {
  if (pathname === "/") return false;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

async function hasValidSession(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get("prospection_session")?.value;
  if (!token) return false;
  const raw = process.env.AUTH_SECRET;
  if (!raw) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(raw));
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const authed = await hasValidSession(req);
  if (!authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
