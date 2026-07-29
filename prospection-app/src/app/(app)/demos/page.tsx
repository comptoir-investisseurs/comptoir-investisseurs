import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, Button, Badge } from "@/components/ui";
import { ConfirmButton } from "@/components/client";
import { formatDate } from "@/lib/utils";
import { deleteDemoAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function DemosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const demos = await prisma.websiteDemo.findMany({
    where: { workspaceId: user.workspaceId },
    orderBy: { createdAt: "desc" },
    include: { prospect: { select: { id: true, businessName: true } } },
  });
  const demoBase = process.env.DEMO_BASE_URL ?? "http://localhost:3000/demo";
  const now = Date.now();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Démonstrations de sites</h1>
        <p className="text-sm text-muted-foreground">
          Chaque démonstration est non indexée (noindex) et porte une mention « non officielle ». Générez-les depuis la
          fiche d&apos;un prospect.
        </p>
      </div>

      {demos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Aucune démonstration. Ouvrez une fiche prospect et cliquez sur « Générer une démo ».
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {demos.map((d) => {
            const expired = d.expiresAt ? d.expiresAt.getTime() < now : false;
            return (
              <Card key={d.id}>
                <CardContent className="space-y-3 py-4">
                  <div className="flex items-center justify-between">
                    <Link href={`/prospects/${d.prospect.id}`} className="font-medium text-primary hover:underline">
                      {d.prospect.businessName}
                    </Link>
                    <Badge tone={expired ? "red" : "green"}>{expired ? "Expirée" : "Active"}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Modèle {d.template} · /{d.slug}
                    <br />
                    Créée le {formatDate(d.createdAt)} · expire le {formatDate(d.expiresAt)}
                  </p>
                  <div className="flex gap-2">
                    <a href={`${demoBase}/${d.slug}`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline">Ouvrir</Button>
                    </a>
                    <form action={deleteDemoAction.bind(null, d.id)}>
                      <ConfirmButton type="submit" size="sm" variant="danger" message="Supprimer cette démonstration ?">
                        Supprimer
                      </ConfirmButton>
                    </form>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
