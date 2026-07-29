import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Textarea } from "@/components/ui";
import { CATEGORIES } from "@/lib/domain";
import { createProspectAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default function NewProspectPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ajouter un prospect</h1>
        <Link href="/prospects"><Button variant="ghost">Retour</Button></Link>
      </div>

      {searchParams.error === "doublon" ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Ce prospect semble déjà exister (doublon détecté). Il n&apos;a pas été ajouté.
        </div>
      ) : null}

      <Card>
        <CardHeader><CardTitle>Fiche prospect</CardTitle></CardHeader>
        <CardContent>
          <form action={createProspectAction} className="space-y-4">
            <div>
              <Label htmlFor="businessName">Nom de l&apos;entreprise *</Label>
              <Input id="businessName" name="businessName" required />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="category">Activité</Label>
                <Select id="category" name="category" defaultValue="">
                  <option value="">—</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="capitalize">{c}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="city">Ville</Label>
                <Input id="city" name="city" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="address">Adresse</Label>
                <Input id="address" name="address" />
              </div>
              <div>
                <Label htmlFor="postalCode">Code postal</Label>
                <Input id="postalCode" name="postalCode" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input id="phone" name="phone" />
              </div>
              <div>
                <Label htmlFor="email">E-mail public</Label>
                <Input id="email" name="email" type="email" />
              </div>
            </div>
            <div>
              <Label htmlFor="websiteUrl">Site internet</Label>
              <Input id="websiteUrl" name="websiteUrl" placeholder="https://…" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="facebookUrl">URL Facebook</Label>
                <Input id="facebookUrl" name="facebookUrl" />
              </div>
              <div>
                <Label htmlFor="instagramUrl">URL Instagram</Label>
                <Input id="instagramUrl" name="instagramUrl" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="rating">Note moyenne</Label>
                <Input id="rating" name="rating" type="number" step="0.1" min={0} max={5} />
              </div>
              <div>
                <Label htmlFor="reviewCount">Nombre d&apos;avis</Label>
                <Input id="reviewCount" name="reviewCount" type="number" min={0} />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={3} />
            </div>
            <div className="flex gap-2">
              <Button type="submit">Enregistrer</Button>
              <Link href="/prospects"><Button type="button" variant="ghost">Annuler</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
