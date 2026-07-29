"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAction } from "./actions";
import { Button, Card, CardContent, Input, Label } from "@/components/ui";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Connexion…" : "Se connecter"}
    </Button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, {});
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold">Prospection Locale</h1>
          <p className="mt-1 text-sm text-muted-foreground">CRM de vente de sites internet aux commerces locaux</p>
        </div>
        <Card>
          <CardContent className="py-6">
            <form action={formAction} className="space-y-4">
              <div>
                <Label htmlFor="email">Adresse e-mail</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required defaultValue="demo@prospection.local" />
              </div>
              <div>
                <Label htmlFor="password">Mot de passe</Label>
                <Input id="password" name="password" type="password" autoComplete="current-password" required defaultValue="demo1234" />
              </div>
              {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
              <SubmitButton />
            </form>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Compte de démonstration pré-rempli. Modifiable via le seed.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
