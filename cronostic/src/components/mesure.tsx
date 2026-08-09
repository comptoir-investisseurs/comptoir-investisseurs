"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Sonde de mesure d'audience. Envoie le chemin consulté, rien d'autre : ni
 * cookie, ni identifiant, ni référent, ni résolution d'écran. Le compteur
 * n'est pas incrémenté deux fois pour une même page dans une même vue,
 * l'effet de rendu étant susceptible de se rejouer.
 */
export function Mesure() {
  const chemin = usePathname();
  const dernier = useRef<string | null>(null);

  useEffect(() => {
    if (!chemin || dernier.current === chemin) return;
    dernier.current = chemin;

    const corps = JSON.stringify({ chemin });
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/mesure", new Blob([corps], { type: "application/json" }));
      } else {
        void fetch("/api/mesure", {
          method: "POST",
          body: corps,
          headers: { "Content-Type": "application/json" },
          keepalive: true,
        });
      }
    } catch {
      // Un compteur muet vaut mieux qu'une page en erreur.
    }
  }, [chemin]);

  return null;
}
