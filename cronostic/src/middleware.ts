import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

const clerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);

/**
 * Clerk exige son middleware pour lire la session côté serveur. Tant qu'il
 * n'est pas configuré, la requête passe telle quelle : la session locale est
 * lue directement depuis le cookie signé.
 */
export default async function middleware(request: NextRequest, event: NextFetchEvent) {
  if (!clerkConfigured) return NextResponse.next();
  const { clerkMiddleware } = await import("@clerk/nextjs/server");
  return clerkMiddleware()(request, event);
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/api/(.*)"],
};
