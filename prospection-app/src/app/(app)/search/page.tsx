import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from "@/components/ui";
import { CATEGORIES } from "@/lib/domain";
import { searchAction, importCsvAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default function SearchPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Recherche de prospects</h1>
        <p className="text-sm text-muted-foreground">
          Sources conformes aux conditions d&apos;utilisation des plateformes. Le fournisseur de démonstration génère des
          données fictives ; l&apos;import CSV et l&apos;ajout manuel alimentent votre base réelle.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Recherche (fournisseur de démonstration)</CardTitle></CardHeader>
          <CardContent>
            <form action={searchAction} className="space-y-4">
              <div>
                <Label htmlFor="category">Activité</Label>
                <Select id="category" name="category" defaultValue="coiffeur">
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="capitalize">
                      {c}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="city">Ville / zone</Label>
                  <Input id="city" name="city" placeholder="Paris 11e" defaultValue="Paris 11e" required />
                </div>
                <div>
                  <Label htmlFor="radiusKm">Rayon (km)</Label>
                  <Input id="radiusKm" name="radiusKm" type="number" min={0} max={100} defaultValue={5} />
                </div>
              </div>
              <div>
                <Label htmlFor="maxResults">Nombre maximal de résultats</Label>
                <Input id="maxResults" name="maxResults" type="number" min={1} max={40} defaultValue={12} />
              </div>
              <input type="hidden" name="provider" value="demo" />
              <Button type="submit">Récupérer les commerces</Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Import CSV</CardTitle></CardHeader>
            <CardContent>
              <form action={importCsvAction} className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Colonnes reconnues : nom, catégorie, adresse, ville, code postal, téléphone, email, site, facebook,
                  instagram, note, avis. Les doublons sont détectés automatiquement.
                </p>
                <Input type="file" name="file" accept=".csv,text/csv" required />
                <Button type="submit" variant="outline">Importer</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Ajout manuel</CardTitle></CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-muted-foreground">Ajoutez un prospect unique en renseignant sa fiche.</p>
              <Link href="/prospects/new"><Button variant="outline">Ajouter un prospect</Button></Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
