import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui";
import { StatusBadge, ScoreBadge, PriorityBadge } from "@/components/badges";
import { CopyButton, OpenButton, ConfirmButton } from "@/components/client";
import {
  StatusChanger,
  NoteForm,
  TaskForm,
  ResponseForm,
  MarkContactedButtons,
  AmountForm,
} from "@/components/prospect-detail-client";
import { formatDate, formatDateTime, formatEuro, parseJson } from "@/lib/utils";
import { CHANNEL_LABELS } from "@/lib/domain";
import type { ScoreContribution } from "@/lib/scoring";
import type { ProspectAudit } from "@/lib/audit";
import type { SiteAnalysis } from "@/lib/site-analyzer";
import {
  analyzeAction,
  generateAuditAction,
  generateMessagesAction,
  generateDemoAction,
  setDoNotContactAction,
  deleteProspectAction,
} from "@/lib/actions";

export const dynamic = "force-dynamic";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

export default async function ProspectDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const prospect = await prisma.prospect.findUnique({
    where: { id: params.id },
    include: {
      analysis: true,
      audit: true,
      notes: { orderBy: { createdAt: "desc" }, include: { user: true } },
      tasks: { orderBy: { createdAt: "desc" } },
      statusHistory: { orderBy: { createdAt: "desc" }, take: 12 },
      messages: { orderBy: { createdAt: "desc" } },
      contacts: { orderBy: { createdAt: "desc" }, take: 12 },
      demos: { orderBy: { createdAt: "desc" } },
      offer: true,
    },
  });
  if (!prospect || prospect.workspaceId !== user.workspaceId) notFound();

  const site = parseJson<{ site: SiteAnalysis | null }>(prospect.analysis?.data ?? null, { site: null }).site;
  const breakdown = parseJson<ScoreContribution[]>(prospect.analysis?.scoreBreakdown ?? null, []);
  const audit = prospect.audit ? parseJson<ProspectAudit | null>(prospect.audit.data, null) : null;
  const demoBase = process.env.DEMO_BASE_URL ?? "http://localhost:3000/demo";

  const analyze = analyzeAction.bind(null, prospect.id);
  const genAudit = generateAuditAction.bind(null, prospect.id);
  const genMessages = generateMessagesAction.bind(null, prospect.id);
  const genDemo = generateDemoAction.bind(null, prospect.id);
  const toggleDNC = setDoNotContactAction.bind(null, prospect.id, !prospect.doNotContact);
  const del = deleteProspectAction.bind(null, prospect.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{prospect.businessName}</h1>
            <ScoreBadge score={prospect.score} />
            <PriorityBadge priority={prospect.priority} />
          </div>
          <p className="mt-1 text-sm capitalize text-muted-foreground">
            {prospect.category ?? "—"} · {prospect.city ?? "—"} · Source&nbsp;: {prospect.source ?? "—"}
          </p>
        </div>
        <Link href="/prospects"><Button variant="ghost">← Prospects</Button></Link>
      </div>

      {prospect.doNotContact ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Ce prospect est marqué « Ne pas contacter ». Aucune sollicitation ne doit lui être adressée.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="space-y-6 lg:col-span-2">
          {/* Actions */}
          <Card>
            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <form action={analyze}><Button type="submit">Analyser</Button></form>
              <form action={genAudit}><Button type="submit" variant="outline">Générer l&apos;audit</Button></form>
              <form action={genMessages}><Button type="submit" variant="outline">Générer les messages</Button></form>
              <form action={genDemo}><Button type="submit" variant="outline">Générer une démo</Button></form>
              <form action={toggleDNC}>
                <Button type="submit" variant={prospect.doNotContact ? "secondary" : "danger"}>
                  {prospect.doNotContact ? "Réautoriser le contact" : "Ne pas contacter"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Analyse */}
          <Card>
            <CardHeader><CardTitle>Analyse de la présence numérique</CardTitle></CardHeader>
            <CardContent>
              {!prospect.analysis ? (
                <p className="text-sm text-muted-foreground">Pas encore analysé. Cliquez sur « Analyser ».</p>
              ) : (
                <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
                  <Row label="Site internet">{prospect.websiteUrl ? "Oui" : "Aucun"}</Row>
                  <Row label="Présence sociale">{prospect.facebookUrl || prospect.instagramUrl ? "Oui" : "Non"}</Row>
                  {site ? (
                    <>
                      <Row label="Accessible">{site.reachable ? "Oui" : "Non"}</Row>
                      <Row label="HTTPS">{site.https ? "Oui" : "Non"}</Row>
                      <Row label="Adapté mobile">{site.hasViewport ? "Oui" : "Non"}</Row>
                      <Row label="Prise de RDV">{site.hasBooking ? "Oui" : "Non"}</Row>
                      <Row label="Appel à l'action">{site.hasCallToAction ? "Oui" : "Non"}</Row>
                      <Row label="Formulaire">{site.hasForm ? "Oui" : "Non"}</Row>
                      <Row label="Mentions légales">{site.hasLegalMentions ? "Oui" : "Non"}</Row>
                      <Row label="Semble ancien">{site.looksOld ? "Oui" : "Non"}</Row>
                      <Row label="Temps de réponse">{site.responseMs ? `${site.responseMs} ms` : "—"}</Row>
                      <Row label="Titre">{site.title ?? "—"}</Row>
                    </>
                  ) : prospect.websiteUrl ? (
                    <Row label="Site">Injoignable lors de l&apos;analyse</Row>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Score détaillé */}
          <Card>
            <CardHeader><CardTitle>Score commercial détaillé</CardTitle></CardHeader>
            <CardContent>
              {breakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">Analysez le prospect pour obtenir le détail du score.</p>
              ) : (
                <ul className="space-y-1.5">
                  {breakdown.map((c, i) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span>{c.label}</span>
                      <span className={c.points >= 0 ? "font-medium text-emerald-600" : "font-medium text-red-600"}>
                        {c.points >= 0 ? "+" : ""}
                        {c.points}
                      </span>
                    </li>
                  ))}
                  <li className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm font-semibold">
                    <span>Score final (borné 0–100)</span>
                    <span>{prospect.score}/100</span>
                  </li>
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Audit */}
          <Card>
            <CardHeader><CardTitle>Audit commercial</CardTitle></CardHeader>
            <CardContent>
              {!audit ? (
                <p className="text-sm text-muted-foreground">Aucun audit généré.</p>
              ) : (
                <div className="space-y-4 text-sm">
                  <p className="whitespace-pre-line">{audit.summary}</p>
                  <AuditList title="Forces" items={audit.strengths} tone="green" />
                  <AuditList title="Faiblesses" items={audit.weaknesses} tone="red" />
                  <AuditList title="Problèmes prioritaires" items={audit.priorityIssues} tone="amber" />
                  <AuditList title="Opportunités" items={audit.opportunities} tone="blue" />
                  <div>
                    <p className="font-medium">Solution recommandée</p>
                    <p className="text-muted-foreground">{audit.recommendedSolution}</p>
                  </div>
                  <div>
                    <p className="font-medium">Proposition commerciale</p>
                    <p className="text-muted-foreground">{audit.commercialProposal}</p>
                  </div>
                  <AuditList title="Bénéfices possibles" items={audit.possibleBenefits} tone="green" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Messages */}
          <Card>
            <CardHeader><CardTitle>Messages de prospection</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {prospect.messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun message généré. Les envois automatiques en masse sont désactivés : copiez le message puis
                  ouvrez le canal pour l&apos;envoyer manuellement.
                </p>
              ) : (
                prospect.messages.map((m) => {
                  const used = parseJson<string[]>(m.usedData, []);
                  return (
                    <div key={m.id} className="rounded-md border border-border p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <Badge tone="blue">{CHANNEL_LABELS[m.channel as keyof typeof CHANNEL_LABELS] ?? m.channel}</Badge>
                        <CopyButton text={m.subject ? `${m.subject}\n\n${m.body}` : m.body} />
                      </div>
                      {m.subject ? <p className="mb-1 text-sm font-medium">Objet : {m.subject}</p> : null}
                      <p className="whitespace-pre-line text-sm text-foreground">{m.body}</p>
                      {used.length > 0 ? (
                        <p className="mt-2 text-xs text-muted-foreground">Données utilisées : {used.join(", ")}</p>
                      ) : null}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Démos */}
          <Card>
            <CardHeader><CardTitle>Démonstrations de site</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {prospect.demos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune démonstration générée.</p>
              ) : (
                prospect.demos.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
                    <div>
                      <p className="font-medium">/{d.slug}</p>
                      <p className="text-xs text-muted-foreground">
                        Modèle {d.template} · expire le {formatDate(d.expiresAt)}
                      </p>
                    </div>
                    <a href={`${demoBase}/${d.slug}`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline">Ouvrir</Button>
                    </a>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Statut & pipeline</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2"><StatusBadge status={prospect.status} /></div>
              <StatusChanger prospectId={prospect.id} current={prospect.status} />
              <AmountForm prospectId={prospect.id} amount={prospect.potentialAmount} />
              {prospect.offer ? <p className="text-xs text-muted-foreground">Offre : {prospect.offer.name}</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Coordonnées & liens</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              <Row label="Adresse">{prospect.address ?? "—"}</Row>
              <Row label="Code postal">{prospect.postalCode ?? "—"}</Row>
              <Row label="Téléphone">{prospect.phone ?? "—"}</Row>
              <Row label="E-mail">{prospect.email ?? "—"}</Row>
              <Row label="Note">{prospect.rating ? `${prospect.rating.toString().replace(".", ",")}/5` : "—"}</Row>
              <Row label="Avis">{prospect.reviewCount ?? "—"}</Row>
              <div className="mt-3 flex flex-wrap gap-2">
                <OpenButton url={prospect.websiteUrl} label="Ouvrir le site" />
                <OpenButton url={prospect.facebookUrl} label="Facebook" />
                <OpenButton url={prospect.instagramUrl} label="Instagram" />
                <OpenButton url={prospect.listingUrl} label="Fiche" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Marquer comme contacté</CardTitle></CardHeader>
            <CardContent><MarkContactedButtons prospectId={prospect.id} /></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Enregistrer une réponse</CardTitle></CardHeader>
            <CardContent><ResponseForm prospectId={prospect.id} /></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Prochaine action</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <TaskForm prospectId={prospect.id} />
              <ul className="space-y-1 text-sm">
                {prospect.tasks.map((t) => (
                  <li key={t.id} className={t.done ? "text-muted-foreground line-through" : ""}>
                    {t.title} {t.dueAt ? `· ${formatDate(t.dueAt)}` : ""}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Notes internes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <NoteForm prospectId={prospect.id} />
              <ul className="space-y-2 text-sm">
                {prospect.notes.map((n) => (
                  <li key={n.id} className="rounded-md bg-muted/60 p-2">
                    <p className="whitespace-pre-line">{n.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {n.user?.email ?? "—"} · {formatDateTime(n.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Historique</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-xs text-muted-foreground">
              {prospect.contacts.map((c) => (
                <p key={c.id}>
                  {formatDateTime(c.createdAt)} — {c.direction === "inbound" ? "Réponse" : "Contact"} ({c.outcome ?? c.channel})
                </p>
              ))}
              {prospect.statusHistory.map((h) => (
                <p key={h.id}>
                  {formatDateTime(h.createdAt)} — statut → {h.toStatus}
                </p>
              ))}
              {prospect.contacts.length === 0 && prospect.statusHistory.length === 0 ? <p>Aucun événement.</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Conformité</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <p>Collecté le {formatDate(prospect.collectedAt)} · source {prospect.source ?? "—"}.</p>
              <p>CA potentiel : {formatEuro(prospect.potentialAmount)}.</p>
              <form action={del}>
                <ConfirmButton
                  type="submit"
                  variant="danger"
                  size="sm"
                  message="Supprimer définitivement ce prospect et toutes ses données ?"
                >
                  Supprimer le prospect
                </ConfirmButton>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AuditList({ title, items, tone }: { title: string; items: string[]; tone: "green" | "red" | "amber" | "blue" }) {
  if (!items || items.length === 0) return null;
  const dot: Record<string, string> = {
    green: "bg-emerald-500",
    red: "bg-red-500",
    amber: "bg-amber-500",
    blue: "bg-blue-500",
  };
  return (
    <div>
      <p className="font-medium">{title}</p>
      <ul className="mt-1 space-y-1">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2 text-muted-foreground">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot[tone]}`} />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
