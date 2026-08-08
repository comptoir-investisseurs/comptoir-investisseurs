import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { hasClerk, isProduction } from "@/lib/env";
import { signInLocally } from "./actions";

export const metadata: Metadata = {
  title: "Connexion",
  robots: { index: false, follow: false },
};

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; erreur?: string }>;
}) {
  const sp = await searchParams;
  const target = sp.redirect && sp.redirect.startsWith("/") ? sp.redirect : "/account/guides";

  const user = await getCurrentUser();
  if (user) redirect(target);

  return (
    <div className="mx-auto flex max-w-md flex-col px-5 py-24">
      <p className="surtitre">Cronostic</p>
      <h1 className="titre mt-4 text-3xl text-ivoire">Connexion</h1>
      <p className="mt-4 text-sm leading-relaxed text-parchemin/70">
        Un compte est nécessaire pour acheter un guide, accéder à CRONOSTIC PRO et retrouver vos
        téléchargements. La consultation de l&apos;encyclopédie reste libre.
      </p>

      {hasClerk ? (
        <ClerkSignIn target={target} />
      ) : isProduction && !process.env.DEV_AUTH_SECRET ? (
        <p className="mt-10 border-l-2 border-rubis bg-graphite/40 px-5 py-4 text-sm leading-relaxed text-parchemin/75">
          L&apos;authentification n&apos;est pas configurée sur cette instance. Renseignez les clés
          Clerk, ou à défaut <code className="text-laiton-clair">DEV_AUTH_SECRET</code> pour la
          session locale.
        </p>
      ) : (
        <form action={signInLocally} className="mt-10 space-y-4">
          <input type="hidden" name="redirect" value={target} />
          <div>
            <label
              htmlFor="email"
              className="block text-[0.72rem] tracking-[0.16em] text-acier uppercase"
            >
              Adresse e-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-2 w-full border border-parchemin/20 bg-encre/70 px-4 py-3 text-ivoire outline-none focus:border-laiton/60"
              placeholder="vous@atelier.fr"
            />
          </div>

          {sp.erreur === "email" && (
            <p className="text-sm text-rubis">Adresse e-mail invalide.</p>
          )}

          <button
            type="submit"
            className="w-full bg-laiton px-6 py-3 text-[0.8rem] tracking-[0.16em] text-noir uppercase transition-colors hover:bg-laiton-clair"
          >
            Continuer
          </button>

          <p className="text-xs leading-relaxed text-acier">
            Authentification locale de développement&nbsp;: aucun mot de passe n&apos;est demandé
            tant que Clerk n&apos;est pas configuré. Renseignez
            <code className="mx-1 text-parchemin/70">CLERK_SECRET_KEY</code>
            pour activer l&apos;authentification réelle.
          </p>
        </form>
      )}

      <Link href="/" className="lien-souligne mt-10 self-start text-sm text-parchemin/60">
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}

async function ClerkSignIn({ target }: { target: string }) {
  const { SignIn } = await import("@clerk/nextjs");
  return (
    <div className="mt-10">
      <SignIn
        routing="hash"
        forceRedirectUrl={target}
        signUpForceRedirectUrl={target}
        appearance={{ variables: { colorPrimary: "#c39b48" } }}
      />
    </div>
  );
}
