import type { Metadata } from "next";
import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { contactEmail } from "@/lib/env";
import { supprimerMonCompte } from "./actions";

export const metadata: Metadata = {
  title: "Mes données",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DonneesPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const sp = await searchParams;
  const user = await requireUser("/account/donnees");

  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <p className="surtitre">Mon compte</p>
      <div className="filet mt-2" />
      <h1 className="titre mt-5 text-couverture">Mes données</h1>
      <p className="mt-5 max-w-[64ch] text-encre/72">
        Vous disposez d&apos;un droit d&apos;accès, de rectification, de portabilité et
        d&apos;effacement sur les données qui vous concernent. Les deux premiers s&apos;exercent
        directement ici ; pour toute autre demande,{" "}
        <a href={`mailto:${contactEmail()}`} className="lien-souligne">
          {contactEmail()}
        </a>
        .
      </p>

      {/* Ce que le site conserve --------------------------------- */}
      <section className="mt-12">
        <h2 className="surtitre">Ce que le site conserve</h2>
        <div className="filet mt-2" />
        <div className="mt-6 overflow-x-auto">
          <table className="tableau">
            <thead>
              <tr>
                <th scope="col">Donnée</th>
                <th scope="col">Pourquoi</th>
                <th scope="col">Durée</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Adresse électronique, nom d&apos;affichage</td>
                <td>Identifier le compte, remettre les guides achetés</td>
                <td className="font-technique">Jusqu&apos;à suppression</td>
              </tr>
              <tr>
                <td>Achats et abonnement</td>
                <td>Ouvrir l&apos;accès aux guides, établir la facture</td>
                <td className="font-technique">Jusqu&apos;à suppression</td>
              </tr>
              <tr>
                <td>Coordonnées bancaires</td>
                <td>Non conservées : elles restent chez Stripe</td>
                <td className="font-technique">—</td>
              </tr>
              <tr>
                <td>Pièces comptables</td>
                <td>Obligation légale, conservées par Stripe</td>
                <td className="font-technique">10 ans</td>
              </tr>
              <tr>
                <td>Mesure d&apos;audience</td>
                <td>Compteur de pages, sans cookie ni identifiant</td>
                <td className="font-technique">Agrégée</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="legende mt-3">
          Aucun cookie publicitaire, aucun traceur tiers, aucune revente de données. Le seul cookie
          déposé est celui de votre session, indispensable à la connexion.
        </p>
      </section>

      {/* Portabilité --------------------------------------------- */}
      <section className="mt-14">
        <h2 className="surtitre">Emporter mes données</h2>
        <div className="filet mt-2" />
        <p className="mt-4 max-w-[64ch] text-encre/72">
          Un fichier lisible, au format JSON, qui contient l&apos;intégralité de ce que le site sait
          de vous : compte, achats, abonnement, guides ouverts.
        </p>
        <a href="/api/account/export" className="bouton-secondaire mt-5 inline-block" download>
          Télécharger mes données
        </a>
      </section>

      {/* Effacement ---------------------------------------------- */}
      <section className="mt-14">
        <h2 className="surtitre">Supprimer mon compte</h2>
        <div className="filet mt-2" />

        <div className="encart encart-alerte mt-5">
          <p className="encart-titre">Irréversible</p>
          <p className="mt-2">
            La suppression efface le compte, l&apos;historique d&apos;achats et l&apos;accès aux
            guides — y compris les guides achetés à l&apos;unité, qui ne pourront pas être rendus.
            Téléchargez vos PDF avant de poursuivre.
          </p>
          <p className="mt-2">
            Un abonnement en cours doit être résilié séparément depuis{" "}
            <Link href="/account" className="lien-souligne">
              la gestion de l&apos;abonnement
            </Link>
            .
          </p>
        </div>

        {sp.erreur === "confirmation" && (
          <p className="mt-5 border-l-2 border-alerte bg-papier px-5 py-3 text-legende not-italic text-alerte">
            L&apos;adresse saisie ne correspond pas à celle du compte. Rien n&apos;a été supprimé.
          </p>
        )}

        <form action={supprimerMonCompte} className="mt-6 max-w-md">
          <label htmlFor="confirmation" className="block text-legende not-italic text-encre/72">
            Pour confirmer, saisissez <span className="font-technique">{user.email}</span>
          </label>
          <input
            id="confirmation"
            name="confirmation"
            type="email"
            autoComplete="off"
            required
            className="mt-2 w-full border border-gris-trait bg-papier px-4 py-2.5 text-encre outline-none focus:border-laiton"
          />
          <button type="submit" className="bouton-secondaire mt-4 border-alerte text-alerte">
            Supprimer définitivement mon compte
          </button>
        </form>
      </section>

      <p className="legende mt-14">
        Réclamation possible auprès de la CNIL —{" "}
        <a
          href="https://www.cnil.fr/fr/plaintes"
          className="lien-souligne"
          target="_blank"
          rel="noreferrer"
        >
          cnil.fr
        </a>
        . Voir aussi la{" "}
        <Link href="/confidentialite" className="lien-souligne">
          politique de confidentialité
        </Link>
        .
      </p>
    </div>
  );
}
