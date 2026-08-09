"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { chercher, libelle, type EntreeIndex } from "@/lib/search";

/**
 * Recherche transversale : calibres, guides, marques, fournitures,
 * consommables, outillage et pages.
 *
 * Deux index. Le réduit arrive avec la page et répond dès la première frappe.
 * Le complet — près de neuf cents entrées, dont toutes les fiches d'amorce de
 * l'encyclopédie — est chargé à la première mise au point du curseur, donc
 * avant que la frappe soit terminée. Le filtrage reste local : aucune requête
 * réseau ne s'intercale entre une touche et son résultat.
 */
export function SiteSearch({
  index,
  size = "large",
  placeholder = "265, roue de centre, 9010, chronographe...",
}: {
  index: EntreeIndex[];
  size?: "large" | "compact";
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [complet, setComplet] = useState<EntreeIndex[] | null>(null);
  const [charge, setCharge] = useState(false);
  const router = useRouter();
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Chargement unique, déclenché par la première interaction.
  useEffect(() => {
    if (!charge || complet) return;
    let vivant = true;
    fetch("/api/recherche")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (vivant && Array.isArray(data)) setComplet(data as EntreeIndex[]);
      })
      .catch(() => {
        // L'index réduit reste utilisable : la recherche est dégradée, pas cassée.
      });
    return () => {
      vivant = false;
    };
  }, [charge, complet]);

  const results = useMemo(() => chercher(complet ?? index, query), [complet, index, query]);

  function go(i: number) {
    const cible = results[i];
    if (cible) router.push(cible.href);
  }

  const isLarge = size === "large";

  return (
    <div className="relative w-full">
      <label htmlFor="recherche-site" className="sr-only">
        Que recherchez-vous ?
      </label>
      <div
        className={`flex items-center gap-3 border border-gris-trait bg-papier transition-colors focus-within:border-laiton ${
          isLarge ? "px-5 py-4" : "px-4 py-2.5"
        }`}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 20 20"
          fill="none"
          className="shrink-0 text-laiton"
          aria-hidden="true"
        >
          <circle cx="8.75" cy="8.75" r="6" stroke="currentColor" strokeWidth="1.4" />
          <path d="M13.25 13.25L17.5 17.5" stroke="currentColor" strokeWidth="1.4" />
        </svg>
        <input
          id="recherche-site"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => {
            setOpen(true);
            setCharge(true);
          }}
          onPointerEnter={() => setCharge(true)}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setOpen(false), 120);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              go(highlight);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder={placeholder}
          aria-label="Que recherchez-vous ?"
          className={`w-full bg-transparent text-encre outline-none ${
            isLarge ? "text-etape" : "text-legende"
          }`}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
            className="text-legende tracking-wider text-encre/55 uppercase hover:text-encre"
          >
            Effacer
          </button>
        )}
      </div>

      {open && query.trim() !== "" && (
        <ul className="absolute inset-x-0 top-full z-40 mt-2 max-h-96 overflow-auto border border-gris-trait bg-white">
          {results.length === 0 && (
            <li className="px-5 py-4 text-legende text-encre/55">
              {complet
                ? `Rien ne correspond à « ${query} » — ni calibre, ni marque, ni fourniture au catalogue actuel.`
                : "Recherche en cours de chargement…"}
            </li>
          )}
          {!complet && results.length > 0 && (
            <li className="border-b border-gris-clair px-5 py-2 text-legende not-italic text-encre/45">
              Recherche en cours de chargement — l&apos;encyclopédie complète arrive.
            </li>
          )}
          {results.map((r, i) => (
            <li key={`${r.type}-${r.href}-${r.titre}`}>
              <Link
                href={r.href}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => {
                  if (blurTimer.current) clearTimeout(blurTimer.current);
                }}
                className={`flex items-baseline gap-4 px-5 py-3 transition-colors ${
                  i === highlight ? "bg-papier" : ""
                }`}
              >
                <span className="surtitre w-24 shrink-0 text-encre/45">{libelle(r.type)}</span>
                <span className="font-titre text-etape text-encre">{r.titre}</span>
                <span className="truncate text-legende text-encre/72">{r.sous_titre}</span>
                {r.detail && (
                  <span className="ml-auto shrink-0 font-technique text-legende not-italic text-encre/55">
                    {r.detail}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
