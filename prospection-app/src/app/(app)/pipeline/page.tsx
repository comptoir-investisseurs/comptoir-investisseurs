import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui";
import { ScoreBadge } from "@/components/badges";
import { StatusChanger } from "@/components/prospect-detail-client";
import { PIPELINE_STATUSES, STATUS_LABELS } from "@/lib/domain";
import { formatEuro } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const prospects = await prisma.prospect.findMany({
    where: { workspaceId: user.workspaceId, status: { in: PIPELINE_STATUSES } },
    orderBy: [{ score: "desc" }],
    take: 500,
  });

  const byStatus = new Map<string, typeof prospects>();
  for (const s of PIPELINE_STATUSES) byStatus.set(s, []);
  for (const p of prospects) byStatus.get(p.status)?.push(p);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Pipeline</h1>
        <p className="text-sm text-muted-foreground">
          Vue Kanban. Changez le statut d&apos;un prospect via le menu de sa carte.
        </p>
      </div>

      <div className="kanban-scroll flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STATUSES.map((status) => {
          const items = byStatus.get(status) ?? [];
          const sum = items.reduce((acc, p) => acc + (p.potentialAmount ?? 0), 0);
          return (
            <div key={status} className="w-72 shrink-0">
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold">{STATUS_LABELS[status]}</h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{items.length}</span>
              </div>
              <p className="mb-2 px-1 text-xs text-muted-foreground">{formatEuro(sum)}</p>
              <div className="space-y-2">
                {items.map((p) => (
                  <Card key={p.id} className="p-3">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <Link href={`/prospects/${p.id}`} className="text-sm font-medium text-primary hover:underline">
                        {p.businessName}
                      </Link>
                      <ScoreBadge score={p.score} />
                    </div>
                    <p className="mb-2 text-xs capitalize text-muted-foreground">
                      {p.category ?? "—"} · {p.city ?? "—"}
                    </p>
                    <StatusChanger prospectId={p.id} current={p.status} />
                  </Card>
                ))}
                {items.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    Vide
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
