import { formatDate } from "@/lib/format";
import { listUsers } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function AdminUtilisateursPage() {
  const users = await listUsers();

  return (
    <>
      <h2 className="surtitre">Utilisateurs</h2>

      <div className="cadre mt-6 overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-legende">
          <thead>
            <tr className="border-b border-gris-trait text-surtitre tracking-[0.16em] text-encre/55 uppercase">
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">Rôle</th>
              <th className="px-4 py-3 font-medium">Inscription</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gris-clair">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-papier">
                <td className="px-4 py-3 text-encre">{u.email}</td>
                <td className="px-4 py-3 text-encre/72">{u.displayName ?? "—"}</td>
                <td className="px-4 py-3 text-encre/72">{u.role}</td>
                <td className="px-4 py-3 text-encre/72">{formatDate(u.createdAt)}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-encre/55">
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
