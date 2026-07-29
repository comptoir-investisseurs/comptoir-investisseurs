"use client";

import * as React from "react";
import { Button, Card, CardContent, Badge } from "@/components/ui";
import { CopyButton } from "@/components/client";
import { markContactedAction } from "@/lib/actions";

export interface QueueItem {
  id: string;
  businessName: string;
  city: string | null;
  category: string | null;
  score: number | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  websiteUrl: string | null;
  email: string | null;
  message: string | null;
}

export function QueueRunner({ items }: { items: QueueItem[] }) {
  const [index, setIndex] = React.useState(0);
  const [pending, start] = React.useTransition();
  const item = items[index];

  if (!item) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          File terminée 🎉 — plus aucun prospect à contacter dans la file.
        </CardContent>
      </Card>
    );
  }

  const advance = () => setIndex((i) => i + 1);
  const markAndNext = (channel: string) => {
    start(async () => {
      await markContactedAction(item.id, channel);
      advance();
    });
  };
  const open = (url: string | null) => {
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Prospect {index + 1} / {items.length}</span>
        <Button variant="ghost" size="sm" onClick={advance}>Passer →</Button>
      </div>

      <Card>
        <CardContent className="space-y-4 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{item.businessName}</h2>
              <p className="text-sm capitalize text-muted-foreground">{item.category ?? "—"} · {item.city ?? "—"}</p>
            </div>
            {item.score !== null ? <Badge tone="amber">{item.score}/100</Badge> : null}
          </div>

          <div className="rounded-md border border-border bg-muted/40 p-3">
            {item.message ? (
              <p className="whitespace-pre-line text-sm">{item.message}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucun message généré pour ce prospect. Ouvrez sa fiche pour en générer un.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {item.message ? <CopyButton text={item.message} /> : null}
            {item.facebookUrl ? <Button size="sm" variant="outline" onClick={() => open(item.facebookUrl)}>Ouvrir Facebook</Button> : null}
            {item.instagramUrl ? <Button size="sm" variant="outline" onClick={() => open(item.instagramUrl)}>Ouvrir Instagram</Button> : null}
            {item.websiteUrl ? <Button size="sm" variant="outline" onClick={() => open(item.websiteUrl)}>Ouvrir le site</Button> : null}
            {item.email ? <Button size="sm" variant="outline" onClick={() => open(`mailto:${item.email}`)}>E-mail</Button> : null}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <span className="self-center text-sm text-muted-foreground">Marquer comme envoyé :</span>
            <Button size="sm" disabled={pending} onClick={() => markAndNext("facebook")}>Facebook</Button>
            <Button size="sm" disabled={pending} onClick={() => markAndNext("instagram")}>Instagram</Button>
            <Button size="sm" disabled={pending} onClick={() => markAndNext("email")}>E-mail</Button>
            <Button size="sm" disabled={pending} onClick={() => markAndNext("phone")}>Téléphone</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
