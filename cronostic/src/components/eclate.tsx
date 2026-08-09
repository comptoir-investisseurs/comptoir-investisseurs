"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  COUCHES,
  ENGRENAGES,
  NOMS_NORMALISES,
  PENTE,
  SCHEMA_MANUEL,
  type PieceSchema,
} from "@/data/eclate";
import type { PartRow } from "@/lib/types";

/**
 * Vue éclatée interactive d'un mouvement.
 *
 * Un éclaté d'atelier n'est pas une photographie : c'est un schéma qui montre
 * l'ordre d'assemblage et la chaîne cinématique. C'est exactement ce que fait
 * celui-ci — cinq couches, de la platine au remontage, reliées par les couples
 * qui s'engrènent. Les formes sont stylisées et les cotes ne sont pas celles
 * du calibre : la légende le dit, plutôt que de laisser croire à un relevé.
 *
 * Le choix du dessin vectoriel plutôt que d'un rendu tridimensionnel n'est pas
 * une facilité. Il n'existe pas de modèle 3D de ces mouvements, et en fabriquer
 * un donnerait une précision apparente que la donnée n'a pas. Un trait, lui,
 * s'annonce pour ce qu'il est : il se lit à l'établi, s'imprime, se navigue au
 * clavier, pèse quelques kilo-octets et ne demande aucune carte graphique.
 *
 * Chaque pièce porte son numéro de fourniture — la seule donnée normalisée,
 * donc la seule vérifiable — et renvoie vers la recherche d'offres.
 */
export function Eclate({
  parts,
  caliberReference,
  caliberBrand,
  caliberSlug,
  generique,
}: {
  parts: PartRow[];
  caliberReference: string;
  caliberBrand: string;
  caliberSlug: string;
  /** Aucune nomenclature relevée pour ce calibre : schéma de principe. */
  generique: boolean;
}) {
  const [selection, setSelection] = useState<string | null>(null);
  const [survol, setSurvol] = useState<string | null>(null);

  const parNumero = useMemo(() => {
    const m = new Map<string, PartRow>();
    for (const p of parts) if (p.positionNumber) m.set(p.positionNumber, p);
    return m;
  }, [parts]);

  // On ne dessine que les pièces dont on sait quelque chose : au pire le nom
  // normalisé, jamais une forme sans identité.
  const pieces = SCHEMA_MANUEL.filter(
    (p) => parNumero.has(p.n) || NOMS_NORMALISES[p.n] !== undefined,
  );
  const positions = new Map(pieces.map((p) => [p.n, p]));

  /**
   * Rayon intérieur de la zone cliquable.
   *
   * Le barillet, son ressort et son arbre partagent un centre : une cible
   * circulaire pleine pour chacun signifie que seule la plus petite reçoit le
   * clic, et que le ressort devient inatteignable. Chaque pièce reçoit donc
   * une couronne comprise entre le rayon de sa voisine intérieure et le sien.
   */
  const rayonInterieur = useMemo(() => {
    const groupes = new Map<string, PieceSchema[]>();
    for (const p of pieces) {
      const cle = `${p.x}|${p.y}|${p.couche}`;
      (groupes.get(cle) ?? groupes.set(cle, []).get(cle)!).push(p);
    }
    const bornes = new Map<string, number>();
    for (const lot of groupes.values()) {
      const tries = [...lot].sort((a, b) => a.r - b.r);
      tries.forEach((p, i) => bornes.set(`${p.n}|${p.couche}`, i === 0 ? 0 : tries[i - 1].r));
    }
    return bornes;
  }, [pieces]);

  const actif = survol ?? selection;
  const detail = actif ? parNumero.get(actif) ?? null : null;
  const nomNormalise = actif ? NOMS_NORMALISES[actif] : undefined;

  const y = (p: PieceSchema) => p.y + p.couche * PENTE;

  return (
    <section id="eclate" className="scroll-mt-28">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="surtitre">Vue éclatée</h2>
          <div className="filet mt-2" />
        </div>
        <p className="legende">
          {pieces.length} pièces · cliquez pour identifier
        </p>
      </div>

      <div className="cadre mt-5 grid gap-0 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* ── Le schéma ─────────────────────────────────────── */}
        {/* `min-w-0` : sans lui, l'élément de grille prend la largeur de son
            contenu — 760 px — et fait déborder toute la page sur téléphone,
            au lieu de laisser le conteneur défiler seul. */}
        <div className="min-w-0 overflow-x-auto p-4 sm:p-6">
          <svg
            viewBox="8 6 968 476"
            className="h-auto w-full min-w-[760px]"
            role="group"
            aria-label={`Vue éclatée schématique d'un mouvement ${caliberBrand} ${caliberReference}`}
          >
            {/* Titres de couches */}
            {COUCHES.map((c) => (
              <text
                key={c.indice}
                x={c.x}
                y={466}
                textAnchor="middle"
                className="fill-encre/40"
                style={{ fontSize: 10.5, letterSpacing: "0.16em" }}
              >
                {c.titre.toUpperCase()}
              </text>
            ))}

            {/* Chaîne cinématique, sous les pièces */}
            <g stroke="#bdb6a8" strokeWidth="1.2" fill="none" strokeDasharray="4 5">
              {ENGRENAGES.map(([a, b]) => {
                const pa = positions.get(a);
                const pb = positions.get(b);
                if (!pa || !pb) return null;
                return <line key={`${a}-${b}`} x1={pa.x} y1={y(pa)} x2={pb.x} y2={y(pb)} />;
              })}
            </g>

            {/* Les pièces, de la couche basse vers la haute */}
            {[...pieces]
              .sort((a, b) => a.couche - b.couche || b.r - a.r)
              .map((p) => {
                const enAvant = actif === p.n;
                const attenue = actif !== null && !enAvant;
                const piece = parNumero.get(p.n);
                const nom = piece?.name ?? NOMS_NORMALISES[p.n]?.fr ?? p.n;

                return (
                  <g
                    key={`${p.n}-${p.couche}-${p.r}`}
                    tabIndex={0}
                    role="button"
                    aria-label={`${nom}, fourniture n° ${p.n}`}
                    aria-pressed={selection === p.n}
                    onMouseEnter={() => setSurvol(p.n)}
                    onMouseLeave={() => setSurvol(null)}
                    onFocus={() => setSurvol(p.n)}
                    onBlur={() => setSurvol(null)}
                    onClick={() => setSelection(selection === p.n ? null : p.n)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelection(selection === p.n ? null : p.n);
                      }
                    }}
                    style={{
                      cursor: "pointer",
                      opacity: attenue ? 0.28 : 1,
                      transition: "opacity .15s",
                      outline: "none",
                    }}
                  >
                    <Forme p={p} yy={y(p)} enAvant={enAvant} />
                    <Cible
                      x={p.x}
                      y={y(p)}
                      exterieur={p.r}
                      interieur={rayonInterieur.get(`${p.n}|${p.couche}`) ?? 0}
                    />
                    <text
                      x={p.x}
                      y={y(p) + 3}
                      textAnchor="middle"
                      className={enAvant ? "fill-laiton" : "fill-encre/55"}
                      style={{
                        fontSize: 11,
                        fontWeight: enAvant ? 700 : 500,
                        pointerEvents: "none",
                        // Halo blanc : le numéro doit rester lisible par-dessus
                        // la denture et les traits d'engrènement.
                        paintOrder: "stroke",
                        stroke: "#ffffff",
                        strokeWidth: 3,
                      }}
                    >
                      {p.n}
                    </text>
                  </g>
                );
              })}
          </svg>
        </div>

        {/* ── Le détail ─────────────────────────────────────── */}
        <aside className="border-t border-gris-trait bg-papier p-6 lg:border-t-0 lg:border-l">
          {actif && (nomNormalise || detail) ? (
            <>
              <p className="surtitre">Fourniture n° {actif}</p>
              <p className="titre mt-2 text-etape">{detail?.name ?? nomNormalise?.fr}</p>
              <p className="legende mt-1">{detail?.nameEn ?? nomNormalise?.en}</p>

              <dl className="mt-5 space-y-3 text-legende not-italic">
                <div>
                  <dt className="text-encre/55">Référence de commande</dt>
                  <dd className="mt-0.5 tabular-nums">
                    {detail?.isVerified && detail.orderReference ? (
                      detail.orderReference
                    ) : (
                      <span className="text-encre/45">à relever sur planche</span>
                    )}
                  </dd>
                </div>
                {detail?.category && (
                  <div>
                    <dt className="text-encre/55">Groupe</dt>
                    <dd className="mt-0.5">{detail.category}</dd>
                  </div>
                )}
              </dl>

              {detail?.description && (
                <p className="mt-4 text-legende leading-relaxed text-encre/72">
                  {detail.description}
                </p>
              )}

              <Link
                href={`/pieces?calibre=${caliberSlug}${
                  detail ? `&piece=${encodeURIComponent(detail.reference)}` : ""
                }`}
                className="bouton-secondaire mt-6 w-full"
              >
                Chercher des offres
              </Link>
            </>
          ) : (
            <>
              <p className="surtitre">Identifier une pièce</p>
              <p className="mt-3 text-legende leading-relaxed text-encre/72">
                Survolez ou cliquez une pièce du schéma : son nom, son numéro de fourniture et sa
                référence de commande s&apos;affichent ici, avec un accès direct à la recherche
                d&apos;offres.
              </p>
              <p className="legende mt-4">
                Navigable au clavier : Tab pour parcourir, Entrée pour sélectionner.
              </p>
            </>
          )}
        </aside>
      </div>

      <p className="legende indicatif mt-3 max-w-[76ch]">
        {generique
          ? `Schéma de principe d'un mouvement à remontage manuel. La nomenclature du ${caliberBrand} ${caliberReference} n'est pas encore relevée : les pièces montrées sont celles de la liste normalisée, leurs positions ne sont pas celles de ce calibre`
          : `Schéma d'assemblage : il restitue l'ordre des couches et la chaîne cinématique, non les cotes du calibre. Les formes sont stylisées ; un plan coté demanderait le dessin d'atelier ${caliberBrand}`}
      </p>
    </section>
  );
}

/**
 * Zone cliquable : un disque pour une pièce isolée, une couronne pour une
 * pièce qui en enveloppe une autre. Une épaisseur minimale garantit que la
 * bande reste visable — sous une dizaine de pixels, on ne vise plus, on tente.
 */
function Cible({
  x,
  y,
  exterieur,
  interieur,
}: {
  x: number;
  y: number;
  exterieur: number;
  interieur: number;
}) {
  if (interieur <= 0) {
    return <circle cx={x} cy={y} r={Math.max(exterieur, 14)} fill="transparent" />;
  }
  const epaisseur = Math.max(exterieur - interieur, 12);
  return (
    <circle
      cx={x}
      cy={y}
      r={interieur + epaisseur / 2}
      fill="none"
      stroke="transparent"
      strokeWidth={epaisseur}
    />
  );
}

/** Tracé d'une pièce selon sa nature. Trait laiton, aplat papier, rien d'autre. */
function Forme({ p, yy, enAvant }: { p: PieceSchema; yy: number; enAvant: boolean }) {
  const trait = enAvant ? "#a8762c" : "#3a352c";
  const epaisseur = enAvant ? 2.6 : 1.4;
  const fond = enAvant ? "#f4f1ea" : "#ffffff";

  switch (p.forme) {
    case "platine":
      return (
        <>
          <circle cx={p.x} cy={yy} r={p.r} fill={fond} stroke={trait} strokeWidth={epaisseur} />
          <circle
            cx={p.x}
            cy={yy}
            r={p.r - 10}
            fill="none"
            stroke={trait}
            strokeWidth={0.6}
            opacity={0.5}
          />
        </>
      );

    case "roue":
      return (
        <>
          <circle cx={p.x} cy={yy} r={p.r} fill={fond} stroke={trait} strokeWidth={epaisseur} />
          {/* Denture suggérée : des traits radiaux, pas un profil à développante. */}
          <g stroke={trait} strokeWidth={0.7} opacity={0.6}>
            {Array.from({ length: 16 }, (_, i) => {
              const a = (i / 16) * Math.PI * 2;
              return (
                <line
                  key={i}
                  x1={p.x + Math.cos(a) * (p.r - 4)}
                  y1={yy + Math.sin(a) * (p.r - 4)}
                  x2={p.x + Math.cos(a) * p.r}
                  y2={yy + Math.sin(a) * p.r}
                />
              );
            })}
          </g>
          <circle cx={p.x} cy={yy} r={Math.max(2.5, p.r * 0.16)} fill={trait} opacity={0.7} />
        </>
      );

    case "balancier":
      return (
        <>
          <circle cx={p.x} cy={yy} r={p.r} fill="none" stroke={trait} strokeWidth={epaisseur + 0.8} />
          <g stroke={trait} strokeWidth={epaisseur}>
            <line x1={p.x - p.r} y1={yy} x2={p.x + p.r} y2={yy} />
            <line x1={p.x} y1={yy - p.r} x2={p.x} y2={yy + p.r} />
          </g>
        </>
      );

    case "pont":
      return (
        <path
          d={`M ${p.x - p.r} ${yy - 16}
              q ${p.r * 0.5} -22 ${p.r} -6
              q ${p.r * 0.7} 10 ${p.r} 20
              q -${p.r * 0.4} 22 -${p.r * 1.1} 14
              q -${p.r * 0.8} -6 -${p.r * 0.9} -28 Z`}
          fill={fond}
          stroke={trait}
          strokeWidth={epaisseur}
        />
      );

    case "levier":
      return (
        <>
          <path
            d={`M ${p.x - p.r} ${yy - p.r * 0.5} L ${p.x + p.r} ${yy} L ${p.x - p.r} ${yy + p.r * 0.5} Z`}
            fill={fond}
            stroke={trait}
            strokeWidth={epaisseur}
          />
          <circle cx={p.x} cy={yy} r={2.5} fill={trait} />
        </>
      );

    case "ressort":
      return (
        <circle
          cx={p.x}
          cy={yy}
          r={p.r}
          fill="none"
          stroke={trait}
          strokeWidth={epaisseur}
          strokeDasharray="2 3"
        />
      );

    case "axe":
      return (
        <>
          <rect
            x={p.x - p.r}
            y={yy - 3}
            width={p.r * 2}
            height={6}
            rx={3}
            fill={fond}
            stroke={trait}
            strokeWidth={epaisseur}
          />
        </>
      );
  }
}
