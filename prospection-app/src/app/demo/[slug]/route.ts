import { prisma } from "@/lib/db";
import { contentFromJson, renderDemoHtml } from "@/lib/demo-generator";
import type { DemoTemplate } from "@/lib/domain";

export const dynamic = "force-dynamic";

function page(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const demo = await prisma.websiteDemo.findUnique({ where: { slug: params.slug } });
  if (!demo) {
    return page(
      `<!doctype html><meta name="robots" content="noindex, nofollow"><title>Introuvable</title><body style="font-family:system-ui;padding:40px"><h1>Démonstration introuvable</h1></body>`,
      404,
    );
  }
  if (demo.expiresAt && demo.expiresAt.getTime() < Date.now()) {
    return page(
      `<!doctype html><meta name="robots" content="noindex, nofollow"><title>Expirée</title><body style="font-family:system-ui;padding:40px"><h1>Cette démonstration a expiré</h1><p>Concept de démonstration créé à titre de proposition commerciale.</p></body>`,
      410,
    );
  }
  const content = contentFromJson(demo.content);
  if (!content) return page("<!doctype html><title>Erreur</title>", 500);
  return page(renderDemoHtml(content, demo.template as DemoTemplate));
}
