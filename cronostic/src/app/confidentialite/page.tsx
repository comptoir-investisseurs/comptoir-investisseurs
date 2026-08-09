import type { Metadata } from "next";
import Link from "next/link";

import { contactEmail } from "@/lib/env";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Quelles données Cronostic collecte, pourquoi, combien de temps, et comment exercer vos droits.",
  robots: { index: true, follow: true },
};

function Bloc({ n, titre, children }: { n: number; titre: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <div className="flex items-baseline gap-3">
        <span className="pastille">{n}</span>
        <h2 className="titre text-etape">{titre}</h2>
      </div>
      <div className="prose-atelier mt-3 space-y-3">{children}</div>
    </section>
  );
}

export default function ConfidentialitePage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <p className="surtitre">Informations</p>
      <div className="filet mt-2" />
      <h1 className="titre mt-5 text-couverture">Politique de confidentialité</h1>
      <p className="legende mt-2">Version 1.0</p>

      <p className="mt-8 max-w-[64ch] text-encre/72">
        Cronostic collecte le strict nécessaire à la vente et à la remise de guides techniques.
        Pas de publicité, pas de traceur tiers, pas de revente de données, pas de profilage.
      </p>

      <div className="encart encart-alerte mt-8">
        <p className="encart-titre">Attention</p>
        <p className="mt-2">
          L&apos;identité du responsable de traitement reste à compléter à l&apos;article 1 avant
          la mise en ligne, en cohérence avec les{" "}
          <Link href="/mentions-legales" className="lien-souligne">
            mentions légales
          </Link>
          .
        </p>
      </div>

      <Bloc n={1} titre="Responsable du traitement">
        <p>
          [Raison sociale], [adresse]. Contact :{" "}
          <a href={`mailto:${contactEmail()}`} className="lien-souligne">
            {contactEmail()}
          </a>
          . Aucun délégué à la protection des données n&apos;est désigné : le traitement ne relève
          d&apos;aucun des cas qui l&apos;imposent.
        </p>
      </Bloc>

      <Bloc n={2} titre="Données collectées et finalités">
        <div className="overflow-x-auto">
          <table className="tableau">
            <thead>
              <tr>
                <th scope="col">Donnée</th>
                <th scope="col">Finalité</th>
                <th scope="col">Base légale</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Adresse électronique, nom</td>
                <td>Compte, remise des guides, courriels de commande</td>
                <td>Exécution du contrat</td>
              </tr>
              <tr>
                <td>Achats, abonnement, guides ouverts</td>
                <td>Ouvrir les droits d&apos;accès</td>
                <td>Exécution du contrat</td>
              </tr>
              <tr>
                <td>Paiement</td>
                <td>Encaissement — traité par Stripe</td>
                <td>Exécution du contrat</td>
              </tr>
              <tr>
                <td>Facturation</td>
                <td>Comptabilité</td>
                <td>Obligation légale</td>
              </tr>
              <tr>
                <td>Compteur de pages</td>
                <td>Savoir ce qui est consulté</td>
                <td>Intérêt légitime</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Aucune donnée bancaire ne transite par nos serveurs ni n&apos;y est conservée : le
          paiement se déroule entièrement chez Stripe.
        </p>
      </Bloc>

      <Bloc n={3} titre="Cookies et mesure d'audience">
        <p>
          Un seul cookie est déposé : celui de votre session, strictement nécessaire à la
          connexion. Il n&apos;a pas de finalité publicitaire et ne requiert pas de consentement. Un
          second cookie, temporaire, retient le contenu du panier.
        </p>
        <p>
          La mesure d&apos;audience est interne et sans cookie : seul le nombre de consultations par
          page et par jour est enregistré. La distinction des visites repose sur une empreinte
          technique salée, renouvelée chaque jour et impossible à rattacher à une personne d&apos;un
          jour sur l&apos;autre. Aucune adresse IP n&apos;est conservée. Aucun outil tiers
          — ni Google Analytics, ni bouton de réseau social — n&apos;est chargé.
        </p>
      </Bloc>

      <Bloc n={4} titre="Marquage des fichiers remis">
        <p>
          Chaque guide téléchargé porte, en pied de page, le nom et l&apos;adresse de son
          acquéreur. Cette mention sert exclusivement à décourager la rediffusion. Elle
          n&apos;emporte aucun suivi : le fichier ne communique avec aucun serveur une fois
          téléchargé.
        </p>
      </Bloc>

      <Bloc n={5} titre="Destinataires et sous-traitants">
        <div className="overflow-x-auto">
          <table className="tableau">
            <thead>
              <tr>
                <th scope="col">Prestataire</th>
                <th scope="col">Rôle</th>
                <th scope="col">Hébergement</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Vercel</td>
                <td>Hébergement du site</td>
                <td>Union européenne</td>
              </tr>
              <tr>
                <td>Neon</td>
                <td>Base de données</td>
                <td>Union européenne</td>
              </tr>
              <tr>
                <td>Clerk</td>
                <td>Authentification</td>
                <td>Clauses contractuelles types</td>
              </tr>
              <tr>
                <td>Stripe</td>
                <td>Paiement et facturation</td>
                <td>Clauses contractuelles types</td>
              </tr>
              <tr>
                <td>Cloudflare R2</td>
                <td>Stockage des fichiers</td>
                <td>Union européenne</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Les données ne sont ni vendues, ni louées, ni transmises à des fins publicitaires. Le
          moteur de recherche de fournitures interroge une place de marché tierce à partir de la
          référence recherchée seule : aucune donnée personnelle ne lui est transmise.
        </p>
      </Bloc>

      <Bloc n={6} titre="Durées de conservation">
        <p>
          Compte et historique : jusqu&apos;à la suppression du compte. Pièces comptables : dix ans,
          conservation légale assurée par le prestataire de paiement. Mesure d&apos;audience :
          agrégée, sans donnée individuelle.
        </p>
      </Bloc>

      <Bloc n={7} titre="Vos droits">
        <p>
          Accès, rectification, effacement, portabilité, limitation et opposition s&apos;exercent
          depuis{" "}
          <Link href="/account/donnees" className="lien-souligne">
            votre espace « Mes données »
          </Link>
          , où l&apos;export et la suppression sont immédiats, ou par courriel à{" "}
          <a href={`mailto:${contactEmail()}`} className="lien-souligne">
            {contactEmail()}
          </a>
          . Réponse sous un mois.
        </p>
        <p>
          En cas de désaccord, une réclamation peut être adressée à la CNIL —{" "}
          <a
            href="https://www.cnil.fr/fr/plaintes"
            className="lien-souligne"
            target="_blank"
            rel="noreferrer"
          >
            cnil.fr/fr/plaintes
          </a>
          .
        </p>
      </Bloc>

      <Bloc n={8} titre="Sécurité">
        <p>
          Les échanges sont chiffrés. Les guides ne sont jamais accessibles publiquement : ils ne
          sortent qu&apos;après vérification de la session et du droit d&apos;accès. Les mots de
          passe ne sont pas conservés par le site.
        </p>
      </Bloc>
    </div>
  );
}
