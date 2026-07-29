// Authentification : hachage bcrypt + cookie de session JWT signé (jose).

import "server-only";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";

const COOKIE_NAME = "prospection_session";
const SESSION_DAYS = 7;

function secret(): Uint8Array {
  const raw = process.env.AUTH_SECRET;
  if (!raw || raw.length < 16) {
    throw new Error("AUTH_SECRET manquant ou trop court (min. 16 caractères).");
  }
  return new TextEncoder().encode(raw);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export interface SessionPayload {
  userId: string;
  email: string;
  workspaceId: string;
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export function destroySession(): void {
  cookies().delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (
      typeof payload.userId === "string" &&
      typeof payload.email === "string" &&
      typeof payload.workspaceId === "string"
    ) {
      return { userId: payload.userId, email: payload.email, workspaceId: payload.workspaceId };
    }
    return null;
  } catch {
    return null;
  }
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  workspaceId: string;
  workspaceName: string;
}

/** Renvoie l'utilisateur courant (et son workspace) ou null. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  if (!session) return null;
  const membership = await prisma.membership.findFirst({
    where: { userId: session.userId, workspaceId: session.workspaceId },
    include: { user: true, workspace: true },
  });
  if (!membership) return null;
  return {
    id: membership.user.id,
    email: membership.user.email,
    name: membership.user.name,
    workspaceId: membership.workspace.id,
    workspaceName: membership.workspace.name,
  };
}

/** Authentifie un couple email / mot de passe et crée la session. */
export async function login(email: string, password: string): Promise<CurrentUser | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { memberships: { include: { workspace: true } } },
  });
  if (!user) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;
  const membership = user.memberships[0];
  if (!membership) return null;
  await createSession({ userId: user.id, email: user.email, workspaceId: membership.workspaceId });
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    workspaceId: membership.workspaceId,
    workspaceName: membership.workspace.name,
  };
}
