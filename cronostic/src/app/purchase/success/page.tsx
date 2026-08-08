import type { Metadata } from "next";
import Link from "next/link";

import { GuideCover } from "@/components/guide-cover";
import { requireUser } from "@/lib/auth";
import { getGuideById, recordPurchase } from "@/lib/repo";
import { hasStripe, stripe } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Merci",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PurchaseSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; guide?: string; simule?: string }>;
}) {
  const sp = await searchParams;
  const user = await requireUser("/account/guides");

  let guideId = sp.guide ?? null;

  // Le webhook fait foi, mais il peut arriver après le retour de l'utilisateur :
  // on réconcilie ici pour que le téléchargement soit immédiatement disponible.
  if (sp.session_id && hasStripe) {
    try {
      const session = await stripe().checkout.sessions.retrieve(sp.session_id);
      if (session.payment_status === "paid" && session.metadata?.guideId) {
        guideId = session.metadata.guideId;
        const guide = await getGuideById(guideId);
        if (guide && session.metadata.userId === user.id) {
          await recordPurchase({
            userId: user.id,
            guideId: guide.id,
            amountCents: session.amount_total ?? guide.priceCents,
            currency: (session.currency ?? guide.currency).toUpperCase(),
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId:
              typeof session.payment_intent === "string" ? session.payment_intent : null,
          });
        }
      }
    } catch {
      // Le webhook enregistrera l'achat : on n'échoue pas la page de confirmation.
    }
  }

  const guide = guideId ? await getGuideById(guideId) : null;

  return (
    <div className="mx-auto max-w-2xl px-5 py-24 text-center">
      <p className="surtitre">Commande confirmée</p>
      <h1 className="titre mt-5 text-couverture text-encre sm:text-couverture">Votre guide est disponible.</h1>

      {sp.simule === "1" && (
        <p className="mt-6 text-legende text-encre/55">
          Achat simulé : Stripe n&apos;est pas encore configuré sur cette instance.
        </p>
      )}

      {guide && (
        <div className="mt-12 flex flex-col items-center">
          <GuideCover
            caliberReference={guide.caliberReference}
            coverImageUrl={guide.coverImageUrl}
            pageCount={guide.pageCount}
            className="w-44"
          />
          <p className="font-titre mt-6 text-section text-encre">Omega {guide.caliberReference}</p>
          <p className="mt-1 text-legende text-encre/72">Guide complet Cronostic</p>

          <a
            href={`/api/guides/${guide.id}/download`}
            className="bouton mt-8"
          >
            Télécharger
          </a>
        </div>
      )}

      <p className="mt-12 text-legende text-encre/72">
        Votre guide reste accessible à tout moment depuis{" "}
        <Link href="/account/guides" className="underline underline-offset-4">
          Mes guides
        </Link>
        .
      </p>
    </div>
  );
}
