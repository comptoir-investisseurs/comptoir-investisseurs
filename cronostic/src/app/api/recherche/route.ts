import { NextResponse } from "next/server";

import { indexDeRecherche } from "@/lib/search-index";

export const revalidate = 3600;

/**
 * Index de recherche complet — près de neuf cents entrées.
 *
 * Il n'est plus sérialisé dans chaque page : cela alourdissait tous les
 * chargements de deux cents kilo-octets pour une fonction que la plupart des
 * visiteurs n'utilisent pas. Le champ embarque un index réduit — calibres
 * documentés, marques, pages — qui répond immédiatement, et va chercher le
 * reste à la première mise au point du curseur, avant même que la frappe soit
 * terminée.
 */
export async function GET() {
  const index = await indexDeRecherche();
  // Cache côté serveur et CDN, pas côté navigateur : un guide tout juste
  // publié doit apparaître dans la recherche sans attendre l'expiration d'un
  // cache local, et l'index ne pèse pas assez pour justifier de le figer
  // chez le visiteur.
  return NextResponse.json(index, {
    headers: {
      // `must-revalidate` et non `stale-while-revalidate` : ce dernier autorise
      // le navigateur à resservir sa copie périmée sans attendre, si bien
      // qu'un guide publié restait invisible dans la recherche pour qui avait
      // déjà ouvert le champ. Une revalidation conditionnelle coûte un 304.
      "Cache-Control": "public, max-age=0, must-revalidate, s-maxage=3600",
    },
  });
}
