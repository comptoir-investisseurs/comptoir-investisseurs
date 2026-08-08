/* eslint-disable @next/next/no-img-element */

/**
 * Représentation de la couverture d'un guide.
 *
 * Tant qu'aucune image de couverture n'a été téléversée depuis le back-office,
 * la couverture est composée : mêmes codes que les manuels CRONOSTIC imprimés
 * (filet de laiton, tranche à gauche, référence du calibre en display).
 */
export function GuideCover({
  caliberReference,
  brand = "Omega",
  subtitle = "Guide complet d'entretien",
  coverImageUrl,
  pageCount,
  className = "",
}: {
  caliberReference: string;
  brand?: string;
  subtitle?: string;
  coverImageUrl?: string | null;
  pageCount?: number | null;
  className?: string;
}) {
  if (coverImageUrl) {
    return (
      <div className={`tranche relative aspect-[3/4] overflow-hidden bg-encre ${className}`}>
        <img
          src={coverImageUrl}
          alt={`Couverture du guide CRONOSTIC ${brand} ${caliberReference}`}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`tranche relative flex aspect-[3/4] flex-col justify-between overflow-hidden border border-parchemin/15 bg-[linear-gradient(155deg,#1c1c20_0%,#101012_55%,#0b0b0c_100%)] p-5 ${className}`}
      aria-hidden="true"
    >
      <div className="pointer-events-none absolute inset-3 border border-laiton/22" />

      <div className="relative">
        <p className="font-display text-[0.62rem] tracking-[0.36em] text-laiton uppercase">
          Cronostic
        </p>
        <div className="mt-2 h-px w-8 bg-laiton/60" />
      </div>

      <div className="relative">
        <p className="text-[0.6rem] tracking-[0.3em] text-parchemin/60 uppercase">{brand}</p>
        <p className="font-display mt-1 text-3xl leading-none text-ivoire">{caliberReference}</p>
        <p className="mt-3 max-w-[14ch] text-[0.7rem] leading-snug text-parchemin/70">{subtitle}</p>
      </div>

      <div className="relative flex items-end justify-between">
        <span className="text-[0.55rem] tracking-[0.24em] text-acier uppercase">Atelier</span>
        {pageCount ? (
          <span className="text-[0.55rem] tracking-[0.2em] text-acier uppercase">
            {pageCount} p.
          </span>
        ) : null}
      </div>
    </div>
  );
}
