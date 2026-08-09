import Link from "next/link";

import { diagnostiquerEbay } from "@/lib/ebay";

export const dynamic = "force-dynamic";

export const metadata = { title: "eBay" };

function Etat({ ok, titre, detail }: { ok: boolean; titre: string; detail: string }) {
  return (
    <div className={`cadre p-5 ${ok ? "" : "border-l-[3px] border-l-alerte"}`}>
      <div className="flex items-center gap-3">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${ok ? "bg-methode" : "bg-alerte"}`}
          aria-hidden="true"
        />
        <p className="surtitre">{titre}</p>
      </div>
      <p className="mt-2 font-technique text-legende not-italic break-words text-encre/72">
        {detail}
      </p>
    </div>
  );
}

export default async function AdminEbayPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const requete = sp.q?.trim() || "Omega 265 balance staff";
  const d = await diagnostiquerEbay(requete);

  return (
    <div>
      <h2 className="titre text-section">Connexion eBay</h2>
      <p className="mt-3 max-w-[70ch] text-encre/72">
        Cette page interroge réellement l&apos;API à chaque affichage. Elle sépare les étapes —
        identifiants, jeton, recherche — parce qu&apos;un « ça ne marche pas » global ne dit pas
        s&apos;il faut corriger une clé, une place de marché ou un filtre.
      </p>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <Etat
          ok={d.configure}
          titre="Identifiants"
          detail={
            d.configure
              ? "EBAY_CLIENT_ID et EBAY_CLIENT_SECRET présentes"
              : "EBAY_CLIENT_ID / EBAY_CLIENT_SECRET absentes — aucune annonce ne peut être affichée"
          }
        />
        <Etat ok={d.jeton.ok} titre="Jeton OAuth" detail={d.jeton.detail} />
        <Etat ok={d.recherche.ok} titre="Recherche" detail={d.recherche.detail} />
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="tableau">
          <tbody>
            <tr>
              <td>Environnement</td>
              <td className="font-technique">{d.environnement}</td>
            </tr>
            <tr>
              <td>Place de marché</td>
              <td className="font-technique">{d.marche}</td>
            </tr>
            <tr>
              <td>Catégories imposées</td>
              <td className="font-technique">
                {d.categories ?? "aucune — filtrage sur l'intitulé uniquement"}
              </td>
            </tr>
            <tr>
              <td>Annonces reçues / retenues</td>
              <td className="font-technique">
                {d.recherche.brut} / {d.recherche.retenus}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <form action="/admin/ebay" method="get" className="mt-8 flex max-w-2xl gap-3">
        <input
          type="search"
          name="q"
          defaultValue={requete}
          className="flex-1 border border-gris-trait bg-papier px-4 py-2.5 text-encre outline-none focus:border-laiton"
          aria-label="Requête d'essai"
        />
        <button type="submit" className="bouton-secondaire">
          Tester
        </button>
      </form>

      {!d.configure && (
        <div className="encart encart-alerte mt-10 max-w-[80ch]">
          <p className="encart-titre">Obtenir une clé</p>
          <ol className="mt-3 space-y-2">
            <li>
              <span className="pastille">1</span> Créer un compte sur{" "}
              <a
                href="https://developer.ebay.com"
                className="lien-souligne"
                target="_blank"
                rel="noreferrer"
              >
                developer.ebay.com
              </a>{" "}
              — gratuit, avec le compte eBay habituel.
            </li>
            <li>
              <span className="pastille">2</span> Application keys → créer un jeu de clés{" "}
              <strong>Production</strong>. Le Sandbox ne contient aucune annonce réelle.
            </li>
            <li>
              <span className="pastille">3</span> Recopier <em>App ID (Client ID)</em> dans{" "}
              <code className="font-technique">EBAY_CLIENT_ID</code> et{" "}
              <em>Cert ID (Client Secret)</em> dans{" "}
              <code className="font-technique">EBAY_CLIENT_SECRET</code>.
            </li>
            <li>
              <span className="pastille">4</span> Redéployer, puis recharger cette page : les trois
              voyants doivent passer au vert.
            </li>
          </ol>
          <p className="mt-3">
            Aucune validation manuelle d&apos;eBay n&apos;est requise pour la Browse API en lecture :
            les clés fonctionnent immédiatement. Le quota gratuit est de cinq mille appels par jour,
            très au-delà des besoins d&apos;un site de cette taille — et les résultats sont mis en
            cache un quart d&apos;heure.
          </p>
        </div>
      )}

      {d.configure && !d.recherche.ok && (
        <div className="encart encart-alerte mt-10 max-w-[80ch]">
          <p className="encart-titre">Pistes</p>
          <p className="mt-2">
            Si le jeton est obtenu mais que la recherche ne remonte rien : vérifier que la place de
            marché correspond au pays visé (<code className="font-technique">EBAY_MARKETPLACE_ID</code>{" "}
            — <span className="font-technique">EBAY_FR</span>,{" "}
            <span className="font-technique">EBAY_GB</span>,{" "}
            <span className="font-technique">EBAY_US</span>), et vider{" "}
            <code className="font-technique">EBAY_CATEGORY_IDS</code> : un identifiant de catégorie
            valable sur une place de marché ne l&apos;est pas forcément sur une autre, et une
            catégorie inconnue ne provoque pas d&apos;erreur — elle renvoie zéro résultat.
          </p>
        </div>
      )}

      <p className="legende mt-10">
        <Link href="/pieces" className="lien-souligne">
          Voir la page publique de recherche de pièces
        </Link>
      </p>
    </div>
  );
}
