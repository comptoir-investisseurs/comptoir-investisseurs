// Abstraction du fournisseur IA.
//
// - Mode « none » : générateurs internes déterministes (aucune clé requise).
// - Mode « anthropic » : appel API avec validation Zod des sorties.
//
// Toutes les sorties passent par un schéma Zod. En cas d'erreur ou de sortie
// invalide, on retombe systématiquement sur les modèles internes.

import { buildAuditWithRules, ProspectAuditSchema, type AuditInput, type ProspectAudit } from "./audit";
import {
  buildAllMessages,
  GeneratedMessageSchema,
  type GeneratedMessageDTO,
  type MessageInput,
} from "./messages";
import {
  buildWebsiteContent,
  WebsiteContentSchema,
  type WebsiteContent,
  type WebsiteContentInput,
} from "./demo-generator";
import type { DemoTemplate } from "./domain";

export interface AIProvider {
  readonly name: string;
  generateProspectAudit(input: AuditInput): Promise<{ audit: ProspectAudit; estimatedCost: number }>;
  generateOutreachMessages(input: MessageInput): Promise<{ messages: GeneratedMessageDTO[]; estimatedCost: number }>;
  generateWebsiteContent(
    input: WebsiteContentInput,
    template: DemoTemplate,
  ): Promise<{ content: WebsiteContent; estimatedCost: number }>;
}

// Cache mémoire simple (par clé) pour éviter les régénérations inutiles.
const cache = new Map<string, unknown>();
function cached<T>(key: string, produce: () => T): T {
  if (cache.has(key)) return cache.get(key) as T;
  const value = produce();
  cache.set(key, value);
  return value;
}

/** Fournisseur déterministe sans IA. */
export class RulesProvider implements AIProvider {
  readonly name = "rules";

  async generateProspectAudit(input: AuditInput) {
    const audit = cached(`audit:${input.businessName}:${input.hasWebsite}`, () => buildAuditWithRules(input));
    return { audit, estimatedCost: 0 };
  }

  async generateOutreachMessages(input: MessageInput) {
    return { messages: buildAllMessages(input), estimatedCost: 0 };
  }

  async generateWebsiteContent(input: WebsiteContentInput, template: DemoTemplate) {
    return { content: buildWebsiteContent(input, template), estimatedCost: 0 };
  }
}

/**
 * Fournisseur Anthropic. Utilise l'API Messages avec des sorties JSON
 * validées par Zod. En cas d'échec, retombe sur le RulesProvider.
 */
export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  private readonly fallback = new RulesProvider();
  private readonly apiKey: string;
  private readonly model: string;

  constructor(apiKey: string, model = "claude-sonnet-5") {
    this.apiKey = apiKey;
    this.model = model;
  }

  private async call(system: string, user: string, maxTokens = 1024): Promise<string | null> {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: maxTokens,
          system,
          messages: [{ role: "user", content: user }],
        }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { content?: { type: string; text?: string }[] };
      const text = data.content?.find((c) => c.type === "text")?.text;
      return text ?? null;
    } catch {
      return null;
    }
  }

  private extractJson(text: string): unknown {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }

  async generateProspectAudit(input: AuditInput) {
    const system =
      "Tu es un consultant en présence numérique. Rédige un audit court, factuel, en français. " +
      "N'invente jamais de chiffres ni de gains. Emploie des formulations prudentes (« pourrait », « permettrait »). " +
      "Réponds UNIQUEMENT en JSON respectant les clés fournies.";
    const user = JSON.stringify({ instruction: "Génère l'audit", data: input, priority: input.priority });
    const text = await this.call(system, user, 1200);
    if (text) {
      const parsed = ProspectAuditSchema.safeParse(this.extractJson(text));
      if (parsed.success) return { audit: parsed.data, estimatedCost: 0.01 };
    }
    return this.fallback.generateProspectAudit(input);
  }

  async generateOutreachMessages(input: MessageInput) {
    // Pour les messages, on conserve les gabarits internes (fiables, conformes)
    // afin de garantir qu'aucune donnée n'est inventée.
    return this.fallback.generateOutreachMessages(input);
  }

  async generateWebsiteContent(input: WebsiteContentInput, template: DemoTemplate) {
    const system =
      "Tu rédiges le contenu d'une landing page de démonstration en français, à partir des seules données fournies. " +
      "N'invente pas de fausses informations. Réponds UNIQUEMENT en JSON valide.";
    const user = JSON.stringify({ instruction: "Génère le contenu", data: input, template });
    const text = await this.call(system, user, 1200);
    if (text) {
      const parsed = WebsiteContentSchema.safeParse(this.extractJson(text));
      if (parsed.success) return { content: parsed.data, estimatedCost: 0.01 };
    }
    return this.fallback.generateWebsiteContent(input, template);
  }
}

export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER ?? "none";
  if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    return new AnthropicProvider(process.env.ANTHROPIC_API_KEY, process.env.ANTHROPIC_MODEL);
  }
  return new RulesProvider();
}

export { GeneratedMessageSchema };
