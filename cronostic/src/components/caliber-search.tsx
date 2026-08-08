"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import type { CaliberSummary } from "@/lib/types";

/**
 * Moteur de recherche par calibre. Le catalogue de lancement tient
 * intégralement en mémoire : le filtrage est instantané, sans aller-retour
 * serveur, ce qui est exactement le comportement attendu à l'établi.
 */
export function CaliberSearch({
  calibers,
  size = "large",
}: {
  calibers: CaliberSummary[];
  size?: "large" | "compact";
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const router = useRouter();
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const normalized = q.replace(/^(omega|cal(ibre)?)\s+/i, "");
    return calibers
      .filter((c) => {
        const haystack = [c.reference, c.name, c.slug, c.familyName ?? ""].join(" ").toLowerCase();
        return haystack.includes(normalized) || haystack.includes(q);
      })
      .slice(0, 8);
  }, [calibers, query]);

  function go(index: number) {
    const target = results[index];
    if (target) router.push(`/calibres/${target.slug}`);
  }

  const isLarge = size === "large";

  return (
    <div className="relative w-full">
      <label htmlFor="recherche-calibre" className="sr-only">
        Quel calibre recherchez-vous ?
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
          id="recherche-calibre"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
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
          placeholder="30T2, 265, 266, 267..."
          aria-label="Quel calibre recherchez-vous ?"
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
        <ul className="absolute inset-x-0 top-full z-40 mt-2 max-h-80 overflow-auto border border-gris-trait bg-white">
          {results.length === 0 && (
            <li className="px-5 py-4 text-legende text-encre/55">
              Aucun calibre ne correspond à « {query} » dans le catalogue actuel.
            </li>
          )}
          {results.map((c, i) => (
            <li key={c.slug}>
              <Link
                href={`/calibres/${c.slug}`}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => {
                  if (blurTimer.current) clearTimeout(blurTimer.current);
                }}
                className={`flex items-baseline gap-4 px-5 py-3 transition-colors ${
                  i === highlight ? "bg-papier" : ""
                }`}
              >
                <span className="font-titre text-etape text-encre">{c.reference}</span>
                <span className="truncate text-legende text-encre/72">{c.name}</span>
                {c.introducedYear && (
                  <span className="ml-auto text-legende text-encre/55">{c.introducedYear}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
