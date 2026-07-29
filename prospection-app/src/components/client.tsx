"use client";

import * as React from "react";
import { Button } from "@/components/ui";

export function CopyButton({ text, label = "Copier le message", size = "sm" }: { text: string; label?: string; size?: "sm" | "md" }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? "Copié ✓" : label}
    </Button>
  );
}

export function ConfirmButton({
  children,
  message = "Confirmer cette action ?",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { message?: string; variant?: "primary" | "secondary" | "ghost" | "danger" | "outline"; size?: "sm" | "md" }) {
  return (
    <Button
      {...(props as React.ComponentProps<typeof Button>)}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </Button>
  );
}

/** Ouvre une URL externe dans un nouvel onglet. */
export function OpenButton({ url, label }: { url?: string | null; label: string }) {
  if (!url) return null;
  return (
    <Button type="button" variant="outline" size="sm" onClick={() => window.open(url, "_blank", "noopener,noreferrer")}>
      {label}
    </Button>
  );
}
