import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Textarea, Badge } from "@/components/ui";
import { ConfirmButton } from "@/components/client";
import { createTemplateAction, deleteTemplateAction } from "@/lib/actions";
import { DEMO_TEMPLATES } from "@/lib/domain";

export const dynamic = "force-dynamic";

const KIND_LABELS: Record<string, string> = {
  outreach: "Premier contact",
  followup1: "Relance 1",
  followup2: "Relance 2",
};

export default async function TemplatesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const templates = await prisma.messageTemplate.findMany({
    where: { workspaceId: user.workspaceId },
    orderBy: [{ channel: "asc" }, { kind: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Modèles</h1>
        <p className="text-sm text-muted-foreground">
          Modèles de messages (premier contact et relances) et modèles de sites de démonstration.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Nouveau modèle de message</CardTitle></CardHeader>
          <CardContent>
            <form action={createTemplateAction} className="space-y-3">
              <div>
                <Label htmlFor="name">Nom</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="channel">Canal</Label>
                  <Select id="channel" name="channel" defaultValue="facebook">
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="email">E-mail</option>
                    <option value="phone">Téléphone</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="kind">Type</Label>
                  <Select id="kind" name="kind" defaultValue="outreach">
                    <option value="outreach">Premier contact</option>
                    <option value="followup1">Relance 1</option>
                    <option value="followup2">Relance 2</option>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="subject">Objet (e-mail)</Label>
                <Input id="subject" name="subject" />
              </div>
              <div>
                <Label htmlFor="body">Message</Label>
                <Textarea id="body" name="body" rows={5} required />
              </div>
              <Button type="submit">Créer le modèle</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Modèles de sites</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              Modèles disponibles pour la génération de démonstrations (adaptés au métier) :
            </p>
            <div className="flex flex-wrap gap-2">
              {DEMO_TEMPLATES.map((t) => (
                <Badge key={t} tone="violet">{t}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Modèles de messages ({templates.length})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun modèle personnalisé pour le moment.</p>
          ) : (
            templates.map((t) => (
              <div key={t.id} className="rounded-md border border-border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t.name}</span>
                    <Badge tone="blue">{t.channel}</Badge>
                    <Badge tone="gray">{KIND_LABELS[t.kind] ?? t.kind}</Badge>
                  </div>
                  <form action={deleteTemplateAction.bind(null, t.id)}>
                    <ConfirmButton type="submit" size="sm" variant="danger" message="Supprimer ce modèle ?">
                      Supprimer
                    </ConfirmButton>
                  </form>
                </div>
                {t.subject ? <p className="text-sm font-medium">Objet : {t.subject}</p> : null}
                <p className="whitespace-pre-line text-sm text-muted-foreground">{t.body}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
