import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea } from "@/components/ui";
import { getIdentity, getWeights } from "@/lib/settings";
import { updateIdentityAction, updateWeightsAction, saveOfferAction } from "@/lib/actions";
import { formatEuro } from "@/lib/utils";

export const dynamic = "force-dynamic";

const WEIGHT_LABELS: Record<string, string> = {
  noWebsite: "Absence de site internet",
  notMobileFriendly: "Site non adapté au mobile",
  noBooking: "Absence de prise de rendez-vous",
  slowOrBroken: "Site lent ou défaillant",
  goodRating: "Note ≥ 4/5",
  manyReviews: "Plus de 30 avis",
  activeSocialNoWebsite: "Réseaux actifs mais aucun site",
  noCallToAction: "Absence d'appel à l'action",
  missingInfo: "Informations importantes manquantes",
  modernSitePenalty: "Site déjà moderne (pénalité)",
  bookingIntegratedPenalty: "Réservation déjà intégrée (pénalité)",
  chainPenalty: "Chaîne / franchise (pénalité)",
};

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [identity, weights, offers] = await Promise.all([
    getIdentity(user.workspaceId),
    getWeights(user.workspaceId),
    prisma.offer.findMany({ where: { workspaceId: user.workspaceId }, orderBy: { createdAt: "asc" } }),
  ]);

  const aiProvider = process.env.AI_PROVIDER ?? "none";
  const demoDays = process.env.DEMO_EXPIRATION_DAYS ?? "30";
  const demoBase = process.env.DEMO_BASE_URL ?? "http://localhost:3000/demo";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Paramètres</h1>
        <p className="text-sm text-muted-foreground">Identité commerciale, scoring, offres et configuration.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Identité commerciale & signature</CardTitle></CardHeader>
          <CardContent>
            <form action={updateIdentityAction} className="space-y-3">
              <div>
                <Label htmlFor="firstName">Prénom (utilisé dans le script d&apos;appel)</Label>
                <Input id="firstName" name="firstName" defaultValue={identity.firstName} />
              </div>
              <div>
                <Label htmlFor="companyName">Nom de votre société</Label>
                <Input id="companyName" name="companyName" defaultValue={identity.companyName} />
              </div>
              <div>
                <Label htmlFor="signature">Signature</Label>
                <Textarea id="signature" name="signature" rows={3} defaultValue={identity.signature} />
              </div>
              <Button type="submit">Enregistrer</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Configuration</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Fournisseur IA</span><span className="font-medium">{aiProvider === "anthropic" ? "Anthropic" : "Sans IA (modèles internes)"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Domaine des démonstrations</span><span className="font-medium">{demoBase}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Expiration des démos</span><span className="font-medium">{demoDays} jours</span></div>
            <p className="pt-2 text-xs text-muted-foreground">
              Ces valeurs se configurent via les variables d&apos;environnement (voir .env.example).
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Règles de scoring (pondérations)</CardTitle></CardHeader>
        <CardContent>
          <form action={updateWeightsAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.keys(weights) as (keyof typeof weights)[]).map((key) => (
              <div key={key}>
                <Label htmlFor={key}>{WEIGHT_LABELS[key] ?? key}</Label>
                <Input id={key} name={key} type="number" defaultValue={weights[key]} />
              </div>
            ))}
            <div className="sm:col-span-2 lg:col-span-3">
              <Button type="submit">Enregistrer les pondérations</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Offres commerciales</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {offers.map((o) => (
            <form key={o.id} action={saveOfferAction} className="grid items-end gap-3 sm:grid-cols-4">
              <input type="hidden" name="id" value={o.id} />
              <div className="sm:col-span-1">
                <Label>Nom</Label>
                <Input name="name" defaultValue={o.name} />
              </div>
              <div>
                <Label>Prix de création (€)</Label>
                <Input name="setupPrice" type="number" defaultValue={o.setupPrice ?? ""} />
              </div>
              <div>
                <Label>Abonnement / mois (€)</Label>
                <Input name="monthlyPrice" type="number" defaultValue={o.monthlyPrice ?? ""} />
              </div>
              <Button type="submit" variant="outline">Mettre à jour</Button>
              <input type="hidden" name="description" value={o.description ?? ""} />
            </form>
          ))}

          <div className="border-t border-border pt-4">
            <p className="mb-2 text-sm font-medium">Ajouter une offre</p>
            <form action={saveOfferAction} className="grid items-end gap-3 sm:grid-cols-4">
              <div>
                <Label>Nom</Label>
                <Input name="name" required />
              </div>
              <div>
                <Label>Prix de création (€)</Label>
                <Input name="setupPrice" type="number" />
              </div>
              <div>
                <Label>Abonnement / mois (€)</Label>
                <Input name="monthlyPrice" type="number" />
              </div>
              <Button type="submit">Ajouter</Button>
            </form>
          </div>

          {offers.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Exemple : {offers.map((o) => `${o.name} (${formatEuro(o.setupPrice)} + ${formatEuro(o.monthlyPrice)}/mois)`).join(" · ")}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
