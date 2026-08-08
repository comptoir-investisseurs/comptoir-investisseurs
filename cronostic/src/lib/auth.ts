import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { adminEmails, hasClerk, isProduction } from "./env";
import { ensureUser } from "./repo";
import type { AppUser } from "./types";

export const DEV_SESSION_COOKIE = "cronostic_session";

/* ────────────────────────────────────────────────────────────
   Session locale (utilisée uniquement si Clerk n'est pas configuré)
   ──────────────────────────────────────────────────────────── */

function devSecret(): string {
  const secret = process.env.DEV_AUTH_SECRET;
  if (secret) return secret;
  if (isProduction) {
    throw new Error(
      "DEV_AUTH_SECRET est obligatoire en production tant que Clerk n'est pas configuré.",
    );
  }
  return "cronostic-dev-secret-non-destine-a-la-production";
}

function sign(payload: string): string {
  return createHmac("sha256", devSecret()).update(payload).digest("base64url");
}

export function createDevSessionValue(email: string): string {
  const payload = Buffer.from(email.toLowerCase(), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function readDevSessionValue(raw: string | undefined): string | null {
  if (!raw) return null;
  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const email = Buffer.from(payload, "base64url").toString("utf8");
  return email.includes("@") ? email : null;
}

/* ────────────────────────────────────────────────────────────
   Lecture de l'utilisateur courant
   ──────────────────────────────────────────────────────────── */

export async function getCurrentUser(): Promise<AppUser | null> {
  if (hasClerk) {
    const { currentUser } = await import("@clerk/nextjs/server");
    const clerkUser = await currentUser();
    if (!clerkUser) return null;
    const email =
      clerkUser.primaryEmailAddress?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) return null;
    const user = await ensureUser({
      authId: clerkUser.id,
      email,
      displayName:
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
        clerkUser.username ||
        null,
    });
    return applyAdminOverride(user);
  }

  const jar = await cookies();
  const email = readDevSessionValue(jar.get(DEV_SESSION_COOKIE)?.value);
  if (!email) return null;
  const user = await ensureUser({ authId: null, email });
  return applyAdminOverride(user);
}

function applyAdminOverride(user: AppUser): AppUser {
  const admins = adminEmails();
  if (admins.includes(user.email.toLowerCase())) return { ...user, role: "admin" };
  // Sans liste d'administrateurs définie, l'accès admin n'est ouvert qu'en
  // développement local : jamais en production.
  if (admins.length === 0 && !isProduction) return { ...user, role: "admin" };
  return user;
}

export async function requireUser(returnTo: string): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(returnTo)}`);
  return user;
}

export async function requireAdmin(): Promise<AppUser> {
  const user = await requireUser("/admin");
  if (user.role !== "admin") redirect("/");
  return user;
}

export function signInPath(returnTo: string): string {
  return `/connexion?redirect=${encodeURIComponent(returnTo)}`;
}
