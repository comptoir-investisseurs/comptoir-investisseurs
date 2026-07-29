// Constantes et types du domaine métier (indépendants de l'UI et de la BDD).

export const PROSPECT_STATUSES = [
  "nouveau",
  "a_analyser",
  "qualifie",
  "a_contacter",
  "contacte",
  "relance_a_prevoir",
  "interesse",
  "rdv_pris",
  "proposition_envoyee",
  "negociation",
  "gagne",
  "perdu",
  "ne_pas_contacter",
] as const;

export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];

export const STATUS_LABELS: Record<ProspectStatus, string> = {
  nouveau: "Nouveau",
  a_analyser: "À analyser",
  qualifie: "Qualifié",
  a_contacter: "À contacter",
  contacte: "Contacté",
  relance_a_prevoir: "Relance à prévoir",
  interesse: "Intéressé",
  rdv_pris: "Rendez-vous pris",
  proposition_envoyee: "Proposition envoyée",
  negociation: "Négociation",
  gagne: "Gagné",
  perdu: "Perdu",
  ne_pas_contacter: "Ne pas contacter",
};

// Colonnes affichées dans la vue Kanban (dans l'ordre du pipeline).
export const PIPELINE_STATUSES: ProspectStatus[] = [
  "nouveau",
  "qualifie",
  "a_contacter",
  "contacte",
  "interesse",
  "rdv_pris",
  "proposition_envoyee",
  "negociation",
  "gagne",
  "perdu",
];

export const PROSPECT_PRIORITIES = ["faible", "moyenne", "elevee", "tres_elevee"] as const;
export type ProspectPriority = (typeof PROSPECT_PRIORITIES)[number];

export const PRIORITY_LABELS: Record<ProspectPriority, string> = {
  faible: "Priorité faible",
  moyenne: "Priorité moyenne",
  elevee: "Priorité élevée",
  tres_elevee: "Priorité très élevée",
};

export const CHANNELS = ["facebook", "instagram", "email", "phone", "site", "autre"] as const;
export type Channel = (typeof CHANNELS)[number];

export const CHANNEL_LABELS: Record<Channel, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  email: "E-mail",
  phone: "Téléphone",
  site: "Site web",
  autre: "Autre",
};

// Catégories de commerces ciblés.
export const CATEGORIES = [
  "coiffeur",
  "barbier",
  "institut de beauté",
  "salon de massage",
  "tatoueur",
  "garage",
  "artisan",
  "plombier",
  "électricien",
  "couvreur",
  "paysagiste",
  "restaurant",
  "photographe",
  "coach sportif",
  "ostéopathe",
  "profession indépendante",
] as const;

// Correspondance catégorie -> modèle de démonstration.
export const CATEGORY_TO_TEMPLATE: Record<string, string> = {
  coiffeur: "coiffeur",
  barbier: "barbier",
  "institut de beauté": "institut",
  "salon de massage": "institut",
  tatoueur: "institut",
  garage: "garage",
  artisan: "artisan",
  plombier: "artisan",
  électricien: "artisan",
  couvreur: "artisan",
  paysagiste: "artisan",
  restaurant: "restaurant",
  photographe: "photographe",
  "coach sportif": "coach",
  ostéopathe: "sante",
  "profession indépendante": "artisan",
};

export const DEMO_TEMPLATES = [
  "coiffeur",
  "barbier",
  "institut",
  "artisan",
  "restaurant",
  "sante",
  "garage",
  "photographe",
  "coach",
] as const;
export type DemoTemplate = (typeof DEMO_TEMPLATES)[number];

export function templateForCategory(category?: string | null): DemoTemplate {
  if (!category) return "artisan";
  const key = category.trim().toLowerCase();
  const tpl = CATEGORY_TO_TEMPLATE[key];
  return (tpl as DemoTemplate) ?? "artisan";
}

export function priorityFromScore(score: number): ProspectPriority {
  if (score >= 75) return "tres_elevee";
  if (score >= 55) return "elevee";
  if (score >= 35) return "moyenne";
  return "faible";
}
