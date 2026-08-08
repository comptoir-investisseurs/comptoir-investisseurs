import { formatDate } from "@/lib/format";
import { listUsers } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function AdminUtilisateursPage() {
  const users = await listUsers();

  return (
    <>
      <h2 className="surtitre">Utilisateurs</h2>

      <div className="carte mt-6 overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead>
            <tr className="border-b border-parchemin/12 text-[0.66rem] tracking-[0.16em] text-acier uppercase">
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">Rôle</th>
              <th className="px-4 py-3 font-medium">Inscription</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-parchemin/8">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-graphite/40">
                <td className="px-4 py-3 text-ivoire">{u.email}</td>
                <td className="px-4 py-3 text-parchemin/60">{u.displayName ?? "—"}</td>
                <td className="px-4 py-3 text-parchemin/60">{u.role}</td>
                <td className="px-4 py-3 text-parchemin/60">{formatDate(u.createdAt)}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-acier">
                  Aucun utilisateur enregistré.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
