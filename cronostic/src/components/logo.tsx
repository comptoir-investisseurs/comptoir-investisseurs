/* eslint-disable @next/next/no-img-element */

/**
 * Logotype Cronostic.
 *
 * ⚠️ Le nom s'écrit toujours « Cronostic » — capitale initiale, jamais en
 * capitales d'imprimerie. Aucune classe `uppercase` ne doit s'appliquer dessus.
 *
 * ── Poser le logo définitif ──────────────────────────────────────────────
 * 1. Déposer le fichier détouré (fond transparent, tracé noir) dans
 *    `public/logo.svg` — un PNG en 1000 px de large minimum fait aussi
 *    l'affaire sous le nom `public/logo.png`.
 * 2. Passer `USE_LOGO_FILE` à `true` ci-dessous.
 * Le tracé est recoloré par CSS (`mask-image` + `currentColor`) : le logo
 * suit donc la couleur du texte, en ivoire dans l'en-tête, en laiton sur les
 * couvertures, en noir sur fond clair. Aucun second fichier à produire.
 */
const USE_LOGO_FILE = false;
const LOGO_FILE = "/logo.svg";

export function Wordmark({ className = "" }: { className?: string }) {
  if (USE_LOGO_FILE) {
    return (
      <span
        role="img"
        aria-label="Cronostic"
        className={`inline-block bg-current ${className}`}
        style={{
          maskImage: `url(${LOGO_FILE})`,
          WebkitMaskImage: `url(${LOGO_FILE})`,
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskSize: "contain",
          WebkitMaskSize: "contain",
          maskPosition: "left center",
          WebkitMaskPosition: "left center",
          // Ratio du logotype : ajuster si le fichier déposé est plus étroit.
          aspectRatio: "4.6 / 1",
          height: "1em",
          width: "4.6em",
        }}
      />
    );
  }

  return (
    <span className={`logotype leading-none ${className}`}>Cronostic</span>
  );
}

/** Petit repère gravé, décliné du balancier annulaire. */
export function Marque({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle cx="16" cy="16" r="14.25" stroke="currentColor" strokeWidth="1.1" opacity="0.55" />
      <circle cx="16" cy="16" r="8.5" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="16" cy="16" r="1.6" fill="currentColor" />
      <path d="M16 1.75V6M16 26v4.25M1.75 16H6M26 16h4.25" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="16" cy="7.5" r="1.15" fill="currentColor" opacity="0.8" />
      <circle cx="16" cy="24.5" r="1.15" fill="currentColor" opacity="0.8" />
      <circle cx="7.5" cy="16" r="1.15" fill="currentColor" opacity="0.8" />
      <circle cx="24.5" cy="16" r="1.15" fill="currentColor" opacity="0.8" />
    </svg>
  );
}
