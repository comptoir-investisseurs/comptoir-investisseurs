"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { DEV_SESSION_COOKIE, createDevSessionValue } from "@/lib/auth";
import { isProduction } from "@/lib/env";
import { ensureUser } from "@/lib/repo";

/** Connexion locale — active uniquement tant que Clerk n'est pas configuré. */
export async function signInLocally(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const redirectTo = String(formData.get("redirect") ?? "/account/guides");

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    redirect(`/connexion?erreur=email&redirect=${encodeURIComponent(redirectTo)}`);
  }

  await ensureUser({ authId: null, email });

  const jar = await cookies();
  jar.set(DEV_SESSION_COOKIE, createDevSessionValue(email), {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(redirectTo.startsWith("/") ? redirectTo : "/account/guides");
}

export async function signOutLocally() {
  const jar = await cookies();
  jar.delete(DEV_SESSION_COOKIE);
  redirect("/");
}
