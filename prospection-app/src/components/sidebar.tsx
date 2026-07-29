"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/login/actions";

const NAV = [
  { href: "/dashboard", label: "Tableau de bord", icon: "▤" },
  { href: "/search", label: "Recherche", icon: "◎" },
  { href: "/prospects", label: "Prospects", icon: "☰" },
  { href: "/pipeline", label: "Pipeline", icon: "▦" },
  { href: "/queue", label: "File de prospection", icon: "➤" },
  { href: "/demos", label: "Démonstrations", icon: "◱" },
  { href: "/templates", label: "Modèles", icon: "✎" },
  { href: "/settings", label: "Paramètres", icon: "⚙" },
  { href: "/compliance", label: "Conformité", icon: "§" },
];

export function Sidebar({ user }: { user: { email: string; workspaceName: string } }) {
  const pathname = usePathname();
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-white">
      <div className="border-b border-border px-5 py-4">
        <p className="text-sm font-semibold">Prospection Locale</p>
        <p className="truncate text-xs text-muted-foreground">{user.workspaceName}</p>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active ? "bg-primary/10 font-medium text-primary" : "text-foreground hover:bg-muted",
              )}
            >
              <span className="w-4 text-center text-muted-foreground">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <p className="mb-2 truncate px-2 text-xs text-muted-foreground">{user.email}</p>
        <form action={logoutAction}>
          <button className="w-full rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-muted">
            Se déconnecter
          </button>
        </form>
      </div>
    </aside>
  );
}
