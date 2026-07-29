import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { QueueRunner, type QueueItem } from "@/components/queue-runner";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const prospects = await prisma.prospect.findMany({
    where: {
      workspaceId: user.workspaceId,
      doNotContact: false,
      status: { in: ["nouveau", "qualifie", "a_contacter", "relance_a_prevoir"] },
    },
    orderBy: [{ score: "desc" }],
    take: 100,
    include: { messages: { where: { channel: "facebook" }, take: 1 } },
  });

  const items: QueueItem[] = prospects.map((p) => ({
    id: p.id,
    businessName: p.businessName,
    city: p.city,
    category: p.category,
    score: p.score,
    facebookUrl: p.facebookUrl,
    instagramUrl: p.instagramUrl,
    websiteUrl: p.websiteUrl,
    email: p.email,
    message: p.messages[0]?.body ?? null,
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">File de prospection</h1>
        <p className="text-sm text-muted-foreground">
          Parcourez vos prospects un à un : copiez le message, ouvrez le canal choisi, puis marquez comme envoyé pour
          passer au suivant. Aucun envoi automatique n&apos;est effectué.
        </p>
      </div>
      <QueueRunner items={items} />
    </div>
  );
}
