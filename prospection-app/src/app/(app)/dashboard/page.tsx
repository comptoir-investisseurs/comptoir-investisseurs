import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, Stat, Button } from "@/components/ui";
import { formatEuro } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const ws = user.workspaceId;

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [total, thisWeek, byStatus, contactsAgg, byCategory, byCity, wonAgg] = await Promise.all([
    prisma.prospect.count({ where: { workspaceId: ws } }),
    prisma.prospect.count({ where: { workspaceId: ws, createdAt: { gte: weekAgo } } }),
    prisma.prospect.groupBy({ by: ["status"], where: { workspaceId: ws }, _count: true }),
    prisma.prospectContact.groupBy({ by: ["outcome"], where: { prospect: { workspaceId: ws } }, _count: true }),
    prisma.prospect.groupBy({ by: ["category"], where: { workspaceId: ws }, _count: true }),
    prisma.prospect.groupBy({ by: ["city"], where: { workspaceId: ws }, _count: true }),
    prisma.prospect.aggregate({ where: { workspaceId: ws, status: "gagne" }, _sum: { potentialAmount: true } }),
  ]);

  const statusCount = (s: string) => byStatus.find((x) => x.status === s)?._count ?? 0;
  const outcomeCount = (o: string) => contactsAgg.find((x) => x.outcome === o)?._count ?? 0;

  const qualified = statusCount("qualifie") + statusCount("a_contacter");
  const contacted = statusCount("contacte") + statusCount("interesse") + statusCount("rdv_pris") + statusCount("proposition_envoyee") + statusCount("negociation");
  const sent = outcomeCount("envoye");
  const positive = outcomeCount("reponse_positive");
  const anyResponse = positive + outcomeCount("reponse_negative");
  const responseRate = sent > 0 ? Math.round((anyResponse / sent) * 100) : 0;

  const potential = await prisma.prospect.aggregate({
    where: { workspaceId: ws, status: { notIn: ["perdu", "ne_pas_contacter"] } },
    _sum: { potentialAmount: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground">Vue synthétique de votre activité commerciale.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/search"><Button>Nouvelle recherche</Button></Link>
          <Link href="/prospects"><Button variant="outline">Voir les prospects</Button></Link>
        </div>
      </div>

      {total === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="font-medium">Aucun prospect pour le moment.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Lancez une recherche de démonstration, importez un CSV ou ajoutez un prospect manuellement.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Link href="/search"><Button>Lancer une recherche</Button></Link>
              <Link href="/prospects/new"><Button variant="outline">Ajouter un prospect</Button></Link>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Prospects" value={total} hint={`+${thisWeek} cette semaine`} />
        <Stat label="Qualifiés" value={qualified} />
        <Stat label="Contactés" value={contacted} />
        <Stat label="Taux de réponse" value={`${responseRate} %`} hint={`${sent} messages envoyés`} />
        <Stat label="Réponses positives" value={positive} />
        <Stat label="Rendez-vous" value={statusCount("rdv_pris")} />
        <Stat label="Propositions" value={statusCount("proposition_envoyee")} />
        <Stat label="Clients gagnés" value={statusCount("gagne")} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Stat label="CA potentiel (pipeline)" value={formatEuro(potential._sum.potentialAmount ?? 0)} />
        <Stat label="CA signé (gagnés)" value={formatEuro(wonAgg._sum.potentialAmount ?? 0)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Répartition par statut</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {byStatus.length === 0 ? <p className="text-sm text-muted-foreground">—</p> : null}
            {byStatus
              .slice()
              .sort((a, b) => b._count - a._count)
              .map((s) => (
                <div key={s.status} className="flex items-center justify-between text-sm">
                  <span>{STATUS_LABELS[s.status as keyof typeof STATUS_LABELS] ?? s.status}</span>
                  <span className="font-medium">{s._count}</span>
                </div>
              ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Répartition par métier</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {byCategory
              .slice()
              .sort((a, b) => b._count - a._count)
              .slice(0, 8)
              .map((s) => (
                <div key={s.category ?? "n/a"} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{s.category ?? "Non catégorisé"}</span>
                  <span className="font-medium">{s._count}</span>
                </div>
              ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Répartition par ville</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {byCity
              .slice()
              .sort((a, b) => b._count - a._count)
              .slice(0, 8)
              .map((s) => (
                <div key={s.city ?? "n/a"} className="flex items-center justify-between text-sm">
                  <span>{s.city ?? "Non renseignée"}</span>
                  <span className="font-medium">{s._count}</span>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
