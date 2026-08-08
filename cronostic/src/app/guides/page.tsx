import type { Metadata } from "next";
import Link from "next/link";

import { GuideCard } from "@/components/guide-card";
import { GUIDE_HIGHLIGHTS } from "@/data/catalog";
import { getCurrentUser } from "@/lib/auth";
import { hasActivePro, ownedGuideIds } from "@/lib/entitlements";
import { listGuides } from "@/lib/repo";

export const metadata: Metadata = {
  title: "Guides d'atelier Cronostic",
  description:
    "Les manuels d'atelier Cronostic : démontage, nettoyage, contrôle, lubrification et remontage des mouvements Omega vintage.",
};

export default async function GuidesPage() {
  const user = await getCurrentUser();
  const [guides, owned, pro] = await Promise.all([
    listGuides({ activeOnly: true }),
    ownedGuideIds(user),
    hasActivePro(user),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      <p className="surtitre-marque">Guides Cronostic</p>
      <h1 className="titre mt-4 max-w-2xl text-couverture text-encre sm:text-couverture">
        Des manuels conçus pour être utilisés directement à l&apos;établi.
      </h1>
      <p className="mt-6 max-w-2xl leading-relaxed text-encre/72">
        Chaque guide couvre le cycle complet d&apos;un calibre, planche par planche, avec les
        points de vigilance relevés à la réparation. Format PDF, téléchargeable à vie.
      </p>

      <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-2 text-legende text-encre/72">
        {GUIDE_HIGHLIGHTS.map((h) => (
          <li key={h} className="flex items-baseline gap-2">
            <span className="text-laiton">✓</span>
            {h}
          </li>
        ))}
      </ul>

      {guides.length === 0 ? (
        <div className="cadre mt-14 p-10 text-center">
          <p className="text-encre/72">
            Aucun guide n&apos;est publié pour le moment. Les manuels sont mis en ligne calibre par
            calibre.
          </p>
          <Link href="/calibres" className="lien-souligne mt-5 inline-block text-laiton">
            Parcourir les fiches calibres
          </Link>
        </div>
      ) : (
        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((guide) => (
            <GuideCard
              key={guide.id}
              guide={guide}
              owned={owned.has(guide.id)}
              viaSubscription={pro && guide.includedInSubscription}
            />
          ))}
        </div>
      )}

      <div className="cadre mt-16 flex flex-col items-start gap-6 p-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="surtitre-marque">Cronostic Pro</p>
          <p className="titre mt-2 text-section text-encre">Tous les guides. Un seul abonnement.</p>
        </div>
        <Link
          href="/pro"
          className="border border-laiton px-6 py-3 text-[0.8rem] tracking-[0.16em] text-laiton uppercase transition-colors hover:bg-papier"
        >
          Découvrir
        </Link>
      </div>
    </div>
  );
}
