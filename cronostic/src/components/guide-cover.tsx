/* eslint-disable @next/next/no-img-element */
/**
 * Représentation de la couverture d'un guide.
 *
 * Composée selon la charte : fond papier, filet de laiton, référence du
 * calibre en Caladea. Aucun dégradé, aucune
 * ombre portée — la charte les proscrit. La tranche est marquée par un filet
 * plein, qui code l'objet « manuel » plutôt qu'il ne l'imite.
 */
export function GuideCover({
  caliberReference,
  brand = "Omega",  // remplacé par la marque du calibre partout où elle est connue
  subtitle = "Guide complet d'entretien",
  coverImageUrl,
  pageCount,
  compact = false,
  className = "",
}: {
  caliberReference: string;
  brand?: string;
  subtitle?: string;
  coverImageUrl?: string | null;
  pageCount?: number | null;
  /** Vignette de liste : seuls la marque et la référence restent lisibles. */
  compact?: boolean;
  className?: string;
}) {
  if (coverImageUrl) {
    return (
      <div
        className={`relative aspect-[3/4] overflow-hidden border border-gris-trait border-l-[3px] border-l-laiton bg-papier ${className}`}
      >
        <img
          src={coverImageUrl}
          alt={`Couverture du guide Cronostic ${brand} ${caliberReference}`}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex aspect-[3/4] flex-col justify-between border border-gris-trait border-l-[3px] border-l-laiton bg-papier ${compact ? "p-2.5" : "p-4"} ${className}`}
      aria-hidden="true"
    >
      {/* Le logotype n'apparaît pas ici : en vignette il passerait sous les
          32 px imposés et sa zone de protection ne tiendrait pas. Le nom est
          donc simplement composé — ce n'est pas une recomposition du tracé. */}
      {!compact && (
        <p className="text-legende font-medium tracking-[0.06em] text-encre">Cronostic</p>
      )}

      <div>
        <p className="surtitre">{brand}</p>
        <p className={`titre mt-1 ${compact ? "text-section" : "text-couverture"}`}>
          {caliberReference}
        </p>
        {!compact && (
          <>
            <div className="filet mt-3" />
            <p className="mt-3 max-w-[16ch] text-legende not-italic leading-snug text-encre/70">
              {subtitle}
            </p>
          </>
        )}
      </div>

      {!compact && (
        <div className="flex items-end justify-between text-surtitre tracking-[0.14em] text-encre/50 uppercase">
          <span>Atelier</span>
          {pageCount ? <span>{pageCount} p.</span> : null}
        </div>
      )}
    </div>
  );
}
