"use server";

import { redirect } from "next/navigation";
import { login, destroySession } from "@/lib/auth";
import { z } from "zod";

export async function logoutAction(): Promise<void> {
  destroySession();
  redirect("/login");
}

const LoginSchema = z.object({
  email: z.string().email("Adresse e-mail invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export async function loginAction(_prev: { error?: string } | undefined, formData: FormData): Promise<{ error?: string }> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Données invalides" };
  }
  const user = await login(parsed.data.email, parsed.data.password);
  if (!user) {
    return { error: "Identifiants incorrects." };
  }
  redirect("/dashboard");
}
