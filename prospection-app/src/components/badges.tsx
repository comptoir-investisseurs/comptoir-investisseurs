import { Badge } from "@/components/ui";
import {
  STATUS_LABELS,
  PRIORITY_LABELS,
  type ProspectStatus,
  type ProspectPriority,
} from "@/lib/domain";

const STATUS_TONES: Record<string, "gray" | "blue" | "green" | "amber" | "red" | "violet"> = {
  nouveau: "gray",
  a_analyser: "gray",
  qualifie: "blue",
  a_contacter: "blue",
  contacte: "violet",
  relance_a_prevoir: "amber",
  interesse: "violet",
  rdv_pris: "violet",
  proposition_envoyee: "amber",
  negociation: "amber",
  gagne: "green",
  perdu: "red",
  ne_pas_contacter: "red",
};

export function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status as ProspectStatus] ?? status;
  return <Badge tone={STATUS_TONES[status] ?? "gray"}>{label}</Badge>;
}

const PRIORITY_TONES: Record<string, "gray" | "blue" | "amber" | "red"> = {
  faible: "gray",
  moyenne: "blue",
  elevee: "amber",
  tres_elevee: "red",
};

export function PriorityBadge({ priority }: { priority?: string | null }) {
  if (!priority) return <span className="text-muted-foreground">—</span>;
  const label = PRIORITY_LABELS[priority as ProspectPriority] ?? priority;
  return <Badge tone={PRIORITY_TONES[priority] ?? "gray"}>{label}</Badge>;
}

export function ScoreBadge({ score }: { score?: number | null }) {
  if (score === null || score === undefined) return <span className="text-muted-foreground">—</span>;
  const tone = score >= 75 ? "red" : score >= 55 ? "amber" : score >= 35 ? "blue" : "gray";
  return <Badge tone={tone}>{score}/100</Badge>;
}
