/**
 * Logotype Cronostic.
 *
 * ⚠️ Le nom s'écrit toujours « Cronostic » — capitale initiale, jamais en
 * capitales d'imprimerie. Aucune classe `uppercase` ne doit s'appliquer dessus.
 *
 * Le tracé vient de `public/logo.svg`, vectorisé depuis l'original
 * (`brand/logo-source.jpg`, voir `brand/vectorise-logo.py`). Il est posé en
 * `mask-image` et rempli par `currentColor` : un seul fichier suffit donc pour
 * tous les contextes — ivoire dans l'en-tête, laiton sur les couvertures de
 * guides, noir sur fond clair. Pour remplacer le logotype, il suffit de
 * redéposer `public/logo.svg` et d'ajuster `RATIO` s'il change de proportions.
 */
const LOGO_FILE = "/logo.svg";
const RATIO = 4.667; // largeur / hauteur du lettrage détouré

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Cronostic"
      className={`inline-block bg-current align-middle ${className}`}
      style={{
        maskImage: `url(${LOGO_FILE})`,
        WebkitMaskImage: `url(${LOGO_FILE})`,
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskPosition: "left center",
        WebkitMaskPosition: "left center",
        height: "1em",
        width: `${RATIO}em`,
      }}
    />
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
