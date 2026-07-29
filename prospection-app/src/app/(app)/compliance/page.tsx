import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function CompliancePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Conformité & bonnes pratiques</h1>
        <p className="text-sm text-muted-foreground">
          Cet outil facilite une prospection <strong>manuelle</strong> et responsable. Vous restez responsable du
          respect des règles applicables.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Ce que vous devez respecter</CardTitle></CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Les conditions d&apos;utilisation des sources de données et des plateformes.</li>
            <li>La réglementation applicable à la prospection commerciale (dont e-mail et démarchage).</li>
            <li>Les demandes d&apos;opposition : tout refus doit être respecté immédiatement.</li>
            <li>Les règles relatives aux données personnelles (minimisation, conservation limitée, droit à l&apos;effacement).</li>
            <li>Les restrictions propres à chaque canal (réseaux sociaux, e-mail, téléphone).</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Garde-fous intégrés à l&apos;application</CardTitle></CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li><strong>Aucun envoi automatique de messages privés en masse</strong> sur les réseaux sociaux.</li>
            <li>Validation humaine obligatoire : copie du message puis envoi manuel via le canal choisi.</li>
            <li>Champ « Ne pas contacter » et passage automatique dans ce statut en cas de réponse négative.</li>
            <li>Limite par défaut de deux relances.</li>
            <li>Analyse de site en requêtes statiques uniquement, avec protection anti-SSRF (rejet des adresses internes).</li>
            <li>Provenance des données visible sur chaque fiche (source et date de collecte).</li>
            <li>Suppression possible d&apos;un prospect et de toutes ses données.</li>
            <li>Audits rédigés avec des formulations prudentes, sans promesse de chiffre d&apos;affaires.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Données personnelles</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            N&apos;envoyez à l&apos;IA que les données strictement nécessaires. Conservez les données le temps utile à la
            prospection, puis supprimez-les. Répondez aux demandes d&apos;accès, de rectification et d&apos;opposition.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
