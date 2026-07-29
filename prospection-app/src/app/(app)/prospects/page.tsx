import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button, Card, CardContent, Input, Select, Badge } from "@/components/ui";
import { StatusBadge, ScoreBadge, PriorityBadge } from "@/components/badges";
import { formatDate } from "@/lib/utils";
import { CATEGORIES, PROSPECT_STATUSES, STATUS_LABELS } from "@/lib/domain";
import { analyzeAllAction } from "@/lib/actions";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

interface SP {
  q?: string;
  category?: string;
  status?: string;
  minScore?: string;
  imported?: string;
  duplicates?: string;
  error?: string;
}

export default async function ProspectsPage({ searchParams }: { searchParams: SP }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const where: Prisma.ProspectWhereInput = { workspaceId: user.workspaceId };
  if (searchParams.q) where.businessName = { contains: searchParams.q };
  if (searchParams.category) where.category = searchParams.category;
  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.minScore) where.score = { gte: Number(searchParams.minScore) };

  const prospects = await prisma.prospect.findMany({
    where,
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Prospects</h1>
          <p className="text-sm text-muted-foreground">{prospects.length} résultat(s) — classés par score décroissant.</p>
        </div>
        <div className="flex gap-2">
          <form action={analyzeAllAction}>
            <Button type="submit" variant="outline">Analyser les nouveaux</Button>
          </form>
          <Link href="/prospects/new"><Button>Ajouter</Button></Link>
        </div>
      </div>

      {searchParams.imported ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {searchParams.imported} prospect(s) importé(s).{" "}
          {searchParams.duplicates && Number(searchParams.duplicates) > 0
            ? `${searchParams.duplicates} doublon(s) ignoré(s).`
            : null}
        </div>
      ) : null}
      {searchParams.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Une erreur est survenue ({searchParams.error}).
        </div>
      ) : null}

      <Card>
        <CardContent className="py-4">
          <form className="grid gap-3 md:grid-cols-5" method="get">
            <Input name="q" placeholder="Rechercher un nom…" defaultValue={searchParams.q} />
            <Select name="category" defaultValue={searchParams.category ?? ""}>
              <option value="">Toutes activités</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="capitalize">{c}</option>
              ))}
            </Select>
            <Select name="status" defaultValue={searchParams.status ?? ""}>
              <option value="">Tous statuts</option>
              {PROSPECT_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </Select>
            <Select name="minScore" defaultValue={searchParams.minScore ?? ""}>
              <option value="">Score minimum</option>
              <option value="35">≥ 35</option>
              <option value="55">≥ 55</option>
              <option value="75">≥ 75</option>
            </Select>
            <Button type="submit" variant="outline">Filtrer</Button>
          </form>
        </CardContent>
      </Card>

      {prospects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Aucun prospect. <Link href="/search" className="text-primary underline">Lancer une recherche</Link>.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Nom</th>
                  <th className="px-4 py-3">Activité</th>
                  <th className="px-4 py-3">Ville</th>
                  <th className="px-4 py-3">Site</th>
                  <th className="px-4 py-3">Note</th>
                  <th className="px-4 py-3">Avis</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Dernier contact</th>
                  <th className="px-4 py-3">Prochaine action</th>
                </tr>
              </thead>
              <tbody>
                {prospects.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Link href={`/prospects/${p.id}`} className="font-medium text-primary hover:underline">
                        {p.businessName}
                      </Link>
                      {p.priority ? <div className="mt-1"><PriorityBadge priority={p.priority} /></div> : null}
                    </td>
                    <td className="px-4 py-3 capitalize">{p.category ?? "—"}</td>
                    <td className="px-4 py-3">{p.city ?? "—"}</td>
                    <td className="px-4 py-3">
                      {p.websiteUrl ? <Badge tone="gray">Oui</Badge> : <Badge tone="amber">Aucun</Badge>}
                    </td>
                    <td className="px-4 py-3">{p.rating ? p.rating.toString().replace(".", ",") : "—"}</td>
                    <td className="px-4 py-3">{p.reviewCount ?? "—"}</td>
                    <td className="px-4 py-3"><ScoreBadge score={p.score} /></td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3">{formatDate(p.lastContactedAt)}</td>
                    <td className="px-4 py-3">{p.nextAction ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
