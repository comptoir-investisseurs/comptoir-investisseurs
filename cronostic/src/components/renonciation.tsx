import Link from "next/link";

/**
 * Renonciation au droit de rétractation.
 *
 * L'article L. 221-28, 13° du code de la consommation ne fait tomber le droit
 * de rétractation sur un contenu numérique que si deux choses sont recueillies
 * **avant** l'exécution : la demande expresse d'exécution immédiate, et la
 * renonciation expresse au délai de quatorze jours. Une mention noyée dans les
 * conditions générales ne suffit pas — d'où cette case distincte, obligatoire,
 * cochée par l'acheteur lui-même et jamais pré-cochée.
 *
 * Le serveur revérifie : une case obligatoire côté navigateur ne prouve rien.
 */
export function Renonciation({ objet }: { objet: "guide" | "abonnement" }) {
  return (
    <div className="cadre-papier mt-6 p-5">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          name="renonciation"
          value="oui"
          required
          className="mt-1 h-4 w-4 shrink-0 accent-laiton"
        />
        <span className="text-legende not-italic leading-relaxed text-encre/80">
          Je demande expressément l&apos;exécution immédiate{" "}
          {objet === "guide" ? "de la commande" : "de l'abonnement"}, avant l&apos;expiration du
          délai de rétractation de quatorze jours, et je renonce expressément à mon droit de
          rétractation. J&apos;accepte les{" "}
          <Link href="/conditions" className="lien-souligne" target="_blank">
            conditions de vente
          </Link>
          .
        </span>
      </label>
      <p className="legende mt-3">
        Sans cette renonciation, le fichier ne peut pas être mis à disposition immédiatement.
        Confirmation vous en est adressée par courriel avec la commande.
      </p>
    </div>
  );
}
