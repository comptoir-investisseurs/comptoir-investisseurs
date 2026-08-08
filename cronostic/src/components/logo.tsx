/**
 * Logotype Cronostic.
 *
 * Règles de la charte appliquées ici :
 *   — le lettrage ne se recompose jamais : on affiche le tracé vectoriel
 *     `public/logo.svg`, jamais une police approchante ;
 *   — deux versions seulement : encre #232019 sur fond clair, blanc en
 *     réserve sur fond sombre. Pas de logo laiton, pas de bichromie, pas de
 *     contour, pas d'ombre ;
 *   — redimensionnement proportionnel uniquement ;
 *   — zone de protection égale à la hauteur du « C » initial de chaque côté ;
 *   — 32 px de haut au minimum à l'écran.
 *
 * Le nom s'écrit toujours « Cronostic » — capitale initiale, jamais en
 * capitales d'imprimerie.
 */
const LOGO_FILE = "/logo.svg";
const RATIO = 4.667; // largeur / hauteur du lettrage détouré
const HAUTEUR_MINIMALE = 32; // px, minimum écran fixé par la charte

export function Wordmark({
  hauteur = HAUTEUR_MINIMALE,
  variante = "encre",
  className = "",
}: {
  hauteur?: number;
  variante?: "encre" | "reserve";
  className?: string;
}) {
  const h = Math.max(hauteur, HAUTEUR_MINIMALE);

  return (
    <span
      role="img"
      aria-label="Cronostic"
      className={`inline-block align-middle ${className}`}
      style={{
        // Zone de protection : la hauteur du C réservée de chaque côté,
        // dans laquelle aucun autre élément n'entre.
        paddingInline: `${h}px`,
        boxSizing: "content-box",
        height: `${h}px`,
        width: `${Math.round(h * RATIO)}px`,
        backgroundColor: variante === "reserve" ? "#ffffff" : "#232019",
        maskImage: `url(${LOGO_FILE})`,
        WebkitMaskImage: `url(${LOGO_FILE})`,
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskSize: `${Math.round(h * RATIO)}px ${h}px`,
        WebkitMaskSize: `${Math.round(h * RATIO)}px ${h}px`,
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
    />
  );
}
