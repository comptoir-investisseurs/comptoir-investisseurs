import type { Metadata } from "next";
import Link from "next/link";

import { GuideCover } from "@/components/guide-cover";
import { requireUser } from "@/lib/auth";
import { viderPanier } from "@/lib/cart";
import { getGuideById, recordPurchase } from "@/lib/repo";
import { hasStripe, stripe } from "@/lib/stripe";
import type { GuideRow } from "@/lib/types";

export const metadata: Metadata = {
  title: "Merci",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PurchaseSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; guide?: string; guides?: string; simule?: string }>;
}) {
  const sp = await searchParams;
  const user = await requireUser("/account/guides");

  let ids = (sp.guides ?? sp.guide ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Le webhook fait foi, mais il peut arriver après le retour de l'utilisateur :
  // on réconcilie ici pour que le téléchargement soit immédiatement disponible.
  if (sp.session_id && hasStripe) {
    try {
      const session = await stripe().checkout.sessions.retrieve(sp.session_id);
      if (session.payment_status === "paid" && session.metadata?.userId === user.id) {
        ids = (session.metadata.guideIds ?? session.metadata.guideId ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        for (const guideId of ids) {
          const guide = await getGuideById(guideId);
          if (!guide) continue;
          await recordPurchase({
            userId: user.id,
            guideId: guide.id,
            amountCents: guide.priceCents,
            currency: guide.currency,
            stripeCheckoutSessionId: ids.length === 1 ? session.id : null,
            stripePaymentIntentId:
              typeof session.payment_intent === "string" ? session.payment_intent : null,
          });
        }
        await viderPanier();
      }
    } catch {
      // Le webhook enregistrera l'achat : on n'échoue pas la confirmation.
    }
  }

  const guides = (await Promise.all(ids.map((id) => getGuideById(id)))).filter(
    (g): g is GuideRow => g !== null,
  );

  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <p className="surtitre">Commande confirmée</p>
      <div className="filet mt-2" />
      <h1 className="titre mt-5 text-couverture">
        {guides.length > 1 ? "Vos guides sont disponibles." : "Votre guide est disponible."}
      </h1>

      {sp.simule === "1" && (
        <p className="legende mt-3">
          Achat simulé : Stripe n&apos;est pas encore configuré sur cette instance.
        </p>
      )}

      {guides.length > 0 && (
        <ul className="mt-10 divide-y divide-gris-clair border-y border-gris-trait">
          {guides.map((guide) => (
            <li key={guide.id} className="flex flex-wrap items-center gap-5 py-5">
              <div className="w-20 shrink-0">
                <GuideCover
                  compact
                  caliberReference={guide.caliberReference}
                  coverImageUrl={guide.coverImageUrl}
                />
              </div>
              <div className="min-w-[10rem] flex-1">
                <p className="titre text-etape">Omega {guide.caliberReference}</p>
                <p className="legende mt-1">
                  Guide complet d&apos;entretien
                  {guide.pageCount ? ` · ${guide.pageCount} pages` : ""}
                </p>
              </div>
              <a href={`/api/guides/${guide.id}/download`} className="bouton">
                Télécharger
              </a>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-legende not-italic text-encre/72">
        {guides.length > 1 ? "Vos guides restent accessibles" : "Votre guide reste accessible"} à
        tout moment depuis{" "}
        <Link href="/account/guides" className="lien-souligne">
          Mes guides
        </Link>
        .
      </p>
    </div>
  );
}
