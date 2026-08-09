import type { Metadata } from "next";
import Link from "next/link";

import { TARIFS, contactEmail, quotaAtelier } from "@/lib/env";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = {
  title: "Conditions générales de vente",
  robots: { index: true, follow: true },
};

function Article({ n, titre, children }: { n: number; titre: string; children: React.ReactNode }) {
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

export default function ConditionsPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <p className="surtitre">Informations</p>
      <div className="filet mt-2" />
      <h1 className="titre mt-5 text-couverture">Conditions générales de vente</h1>
      <p className="legende mt-2">Version 1.0</p>

      <div className="encart encart-alerte mt-8">
        <p className="encart-titre">Attention</p>
        <p className="mt-2">
          Les mentions d&apos;identification du vendeur — raison sociale, forme juridique, siège,
          numéro d&apos;immatriculation, numéro de TVA — restent à compléter à l&apos;article 1
          avant toute mise en vente. Ce document est un modèle de travail : il doit être relu par un
          conseil avant diffusion.
        </p>
      </div>

      <Article n={1} titre="Identification du vendeur">
        <p>
          Le site Cronostic, accessible en ligne, est édité par [raison sociale], [forme juridique]
          au capital de [montant], immatriculée au registre du commerce et des sociétés de [ville]
          sous le numéro [SIREN], dont le siège est situé [adresse], numéro de TVA
          intracommunautaire [numéro].
        </p>
        <p>
          Contact : <a href={`mailto:${contactEmail()}`} className="lien-souligne">{contactEmail()}</a>
        </p>
      </Article>

      <Article n={2} titre="Objet">
        <p>
          Les présentes conditions régissent la vente de contenus numériques : guides d&apos;atelier
          au format PDF, vendus à l&apos;unité ou rendus accessibles par abonnement. Elles
          s&apos;appliquent à toute commande passée sur le site, à l&apos;exclusion de tout autre
          document.
        </p>
        <p>
          La consultation de l&apos;encyclopédie, des fiches techniques, des nomenclatures et des
          références de consommables est libre et gratuite.
        </p>
      </Article>

      <Article n={3} titre="Produits et formules">
        <p>
          <strong>Guide à l&apos;unité.</strong> L&apos;achat d&apos;un guide ouvre un droit
          d&apos;accès permanent au fichier correspondant, indépendant de tout abonnement.
        </p>
        <p>
          <strong>Formule Atelier</strong> ({formatPrice(TARIFS.atelier.mois())} par mois ou{" "}
          {formatPrice(TARIFS.atelier.an())} par an). Elle permet d&apos;ouvrir {quotaAtelier()}{" "}
          guides par période de facturation. Un guide ouvert reste accessible tant que
          l&apos;abonnement demeure actif ; le crédit correspondant est consommé une seule fois, au
          premier téléchargement. Les crédits non utilisés ne sont pas reportés.
        </p>
        <p>
          <strong>Formule Intégrale</strong> ({formatPrice(TARIFS.integral.mois())} par mois ou{" "}
          {formatPrice(TARIFS.integral.an())} par an). Elle ouvre l&apos;accès à l&apos;ensemble des
          guides inclus dans l&apos;abonnement, sans limite de nombre, pendant toute la durée de
          l&apos;abonnement.
        </p>
      </Article>

      <Article n={4} titre="Commande et paiement">
        <p>
          La commande suppose la création d&apos;un compte. Les prix sont indiqués en euros, toutes
          taxes comprises. Le paiement s&apos;effectue en ligne par carte, par l&apos;intermédiaire
          de notre prestataire Stripe ; aucune donnée bancaire ne transite par nos serveurs ni
          n&apos;y est conservée.
        </p>
        <p>
          La commande est ferme à compter de la confirmation du paiement. Une facture est émise et
          adressée par voie électronique.
        </p>
      </Article>

      <Article n={5} titre="Livraison">
        <p>
          Les guides sont mis à disposition immédiatement après confirmation du paiement, dans
          l&apos;espace personnel de l&apos;acheteur et par un lien adressé par courriel. Aucun
          support physique n&apos;est expédié.
        </p>
      </Article>

      <Article n={6} titre="Droit de rétractation — renonciation expresse">
        <p>
          Conformément à l&apos;article L. 221-28, 13° du code de la consommation, le droit de
          rétractation ne peut être exercé pour les contrats de fourniture d&apos;un contenu
          numérique non fourni sur un support matériel dont l&apos;exécution a commencé, avec
          l&apos;accord préalable exprès du consommateur et renoncement exprès de sa part à son
          droit de rétractation.
        </p>
        <p>
          <strong>
            En validant sa commande, l&apos;acheteur demande expressément l&apos;exécution immédiate
            du contrat, avant l&apos;expiration du délai de rétractation de quatorze jours, et
            renonce expressément à son droit de rétractation.
          </strong>{" "}
          Cette double mention est recueillie par une case à cocher distincte, obligatoire, au
          moment de la commande. L&apos;acheteur en reçoit confirmation sur le support durable qui
          accompagne sa commande.
        </p>
        <p>
          En conséquence, aucun remboursement ne peut être demandé au titre de la rétractation dès
          lors que le guide a été mis à disposition. Cette renonciation ne fait obstacle ni à la
          garantie légale de conformité, ni à la garantie des vices cachés.
        </p>
      </Article>

      <Article n={7} titre="Abonnements : durée, renouvellement, résiliation">
        <p>
          Les abonnements sont conclus sans engagement de durée et se renouvellent par tacite
          reconduction à l&apos;échéance de chaque période, jusqu&apos;à résiliation.
        </p>
        <p>
          La résiliation s&apos;effectue à tout moment depuis l&apos;espace personnel. Elle prend
          effet au terme de la période en cours ; celle-ci reste due et l&apos;accès demeure ouvert
          jusqu&apos;à son échéance. Aucun remboursement au prorata n&apos;est pratiqué.
        </p>
        <p>
          À l&apos;issue de l&apos;abonnement, les guides ouverts au seul titre de celui-ci cessent
          d&apos;être accessibles. Les guides achetés à l&apos;unité demeurent accessibles sans
          limitation de durée.
        </p>
        <p>
          En cas d&apos;échec de paiement, l&apos;accès est suspendu après relance. Le vendeur peut
          modifier ses tarifs ; toute modification est notifiée au moins trente jours à l&apos;avance
          et ne s&apos;applique qu&apos;aux périodes suivantes.
        </p>
      </Article>

      <Article n={8} titre="Licence d'utilisation">
        <p>
          L&apos;achat ou l&apos;abonnement confère un droit d&apos;usage personnel et non exclusif,
          au sein d&apos;un même atelier. Sont autorisés la consultation, l&apos;impression pour un
          usage d&apos;établi et la conservation d&apos;une copie de sauvegarde.
        </p>
        <p>
          Sont interdits la revente, la mise à disposition publique, le dépôt sur un service de
          partage, la diffusion sur un forum ou un réseau social, ainsi que toute reproduction hors
          du cadre ci-dessus. Chaque fichier remis porte le nom et l&apos;adresse électronique de
          son acquéreur.
        </p>
      </Article>

      <Article n={9} titre="Disponibilité et contenu">
        <p>
          Les guides décrivent des opérations d&apos;horlogerie destinées à des professionnels et
          supposent la maîtrise du métier et de l&apos;outillage correspondants.
        </p>
        <p>
          Les données techniques non relevées sur une source constructeur sont signalées comme
          indicatives par le repère ◆. Le vendeur met en œuvre les moyens raisonnables pour assurer
          l&apos;exactitude des informations publiées, sans garantie d&apos;exhaustivité.
        </p>
      </Article>

      <Article n={10} titre="Données personnelles">
        <p>
          Les données collectées sont limitées à ce qui est nécessaire à l&apos;exécution du contrat
          et à la tenue de la comptabilité. L&apos;acheteur dispose d&apos;un droit d&apos;accès, de
          rectification, d&apos;effacement et de portabilité, exerçable depuis son espace personnel
          ou à l&apos;adresse de contact.
        </p>
        <p>
          <Link href="/mentions-legales" className="lien-souligne">
            Mentions légales
          </Link>
        </p>
      </Article>

      <Article n={11} titre="Réclamations, médiation et droit applicable">
        <p>
          Toute réclamation peut être adressée à{" "}
          <a href={`mailto:${contactEmail()}`} className="lien-souligne">
            {contactEmail()}
          </a>
          . À défaut de solution amiable, le consommateur peut recourir gratuitement au médiateur de
          la consommation dont relève le vendeur, ou à la plateforme européenne de règlement en
          ligne des litiges.
        </p>
        <p>
          Les présentes conditions sont soumises au droit français. Le nom du médiateur reste à
          désigner avant la mise en vente.
        </p>
      </Article>
    </div>
  );
}
