"use client";

import * as React from "react";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { STATUS_LABELS, PROSPECT_STATUSES, CHANNELS, CHANNEL_LABELS } from "@/lib/domain";
import {
  changeStatusAction,
  addNoteAction,
  addTaskAction,
  recordResponseAction,
  markContactedAction,
  updateProspectAmountAction,
} from "@/lib/actions";

export function StatusChanger({ prospectId, current }: { prospectId: string; current: string }) {
  const [pending, start] = React.useTransition();
  return (
    <Select
      defaultValue={current}
      disabled={pending}
      onChange={(e) => {
        const value = e.target.value;
        start(() => {
          void changeStatusAction(prospectId, value);
        });
      }}
    >
      {PROSPECT_STATUSES.map((s) => (
        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
      ))}
    </Select>
  );
}

export function NoteForm({ prospectId }: { prospectId: string }) {
  const ref = React.useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      action={async (fd) => {
        await addNoteAction(prospectId, String(fd.get("body") ?? ""));
        ref.current?.reset();
      }}
      className="space-y-2"
    >
      <Textarea name="body" rows={2} placeholder="Ajouter une note interne…" required />
      <Button type="submit" size="sm" variant="outline">Ajouter la note</Button>
    </form>
  );
}

export function TaskForm({ prospectId }: { prospectId: string }) {
  const ref = React.useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      action={async (fd) => {
        await addTaskAction(prospectId, String(fd.get("title") ?? ""), String(fd.get("dueAt") ?? "") || undefined);
        ref.current?.reset();
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <div className="flex-1">
        <Input name="title" placeholder="Prochaine action…" required />
      </div>
      <Input name="dueAt" type="date" className="w-40" />
      <Button type="submit" size="sm" variant="outline">Planifier</Button>
    </form>
  );
}

export function ResponseForm({ prospectId }: { prospectId: string }) {
  const ref = React.useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      action={async (fd) => {
        await recordResponseAction(
          prospectId,
          String(fd.get("outcome") ?? "sans_reponse"),
          String(fd.get("body") ?? "") || undefined,
        );
        ref.current?.reset();
      }}
      className="space-y-2"
    >
      <Select name="outcome" defaultValue="reponse_positive">
        <option value="reponse_positive">Réponse positive → Intéressé</option>
        <option value="reponse_negative">Réponse négative → Ne pas contacter</option>
        <option value="sans_reponse">Sans réponse</option>
      </Select>
      <Textarea name="body" rows={2} placeholder="Contenu de la réponse (optionnel)…" />
      <Button type="submit" size="sm" variant="outline">Enregistrer la réponse</Button>
    </form>
  );
}

export function MarkContactedButtons({ prospectId }: { prospectId: string }) {
  const [pending, start] = React.useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      {CHANNELS.filter((c) => c !== "autre").map((c) => (
        <Button
          key={c}
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => start(() => void markContactedAction(prospectId, c))}
        >
          Contacté via {CHANNEL_LABELS[c]}
        </Button>
      ))}
    </div>
  );
}

export function AmountForm({ prospectId, amount }: { prospectId: string; amount: number | null }) {
  return (
    <form
      action={async (fd) => {
        const raw = String(fd.get("amount") ?? "");
        await updateProspectAmountAction(prospectId, raw ? Number(raw) : null);
      }}
      className="flex items-end gap-2"
    >
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Montant potentiel (€)</label>
        <Input name="amount" type="number" min={0} defaultValue={amount ?? ""} className="w-40" />
      </div>
      <Button type="submit" size="sm" variant="outline">Enregistrer</Button>
    </form>
  );
}
