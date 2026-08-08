"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser, signInPath } from "@/lib/auth";
import { ajouterAuPanier, lirePanier, retirerDuPanier, viderPanier } from "@/lib/cart";
import { proAnnualPriceCents, proPriceCents, siteUrl } from "@/lib/env";
import {
  getGuideById,
  getSubscriptionForUser,
  recordPurchase,
  setUserStripeCustomer,
  upsertSubscription,
} from "@/lib/repo";
import { hasStripe, stripe } from "@/lib/stripe";

/* ────────────────────────────────────────────────────────────
   Panier
   ──────────────────────────────────────────────────────────── */

export async function ajouterAuPanierAction(formData: FormData) {
  const guideId = String(formData.get("guideId") ?? "");
  const retour = String(formData.get("retour") ?? "/panier");
  if (!(await getGuideById(guideId))) throw new Error("Guide introuvable.");
  await ajouterAuPanier(guideId);
  revalidatePath(retour);
  redirect("/panier");
}

export async function retirerDuPanierAction(formData: FormData) {
  await retirerDuPanier(String(formData.get("guideId") ?? ""));
  revalidatePath("/panier");
  redirect("/panier");
}

/* ────────────────────────────────────────────────────────────
   Achat — un guide seul, ou le panier entier
   ──────────────────────────────────────────────────────────── */

export async function startGuideCheckout(formData: FormData) {
  const guideId = String(formData.get("guideId") ?? "");
  const guide = await getGuideById(guideId);
  if (!guide) throw new Error("Guide introuvable.");

  const user = await getCurrentUser();
  if (!user) redirect(signInPath(`/purchase/guide/${guideId}`));

  await payer(user, [guide], `/calibres/${guide.caliberSlug}#guide`);
}

export async function payerLePanier() {
  const user = await getCurrentUser();
  if (!user) redirect(signInPath("/panier"));

  const panier = await lirePanier(user);
  if (panier.lignes.length === 0) redirect("/panier");

  await payer(user, panier.lignes, "/panier");
}

/**
 * Crée la session de paiement pour un ou plusieurs guides.
 *
 * Sans clés Stripe, le parcours reste déroulable de bout en bout : les droits
 * sont accordés immédiatement et l'achat est clairement signalé comme simulé.
 */
async function payer(
  user: { id: string; email: string; stripeCustomerId: string | null },
  guides: Awaited<ReturnType<typeof getGuideById>>[],
  annulation: string,
): Promise<never> {
  const lignes = guides.filter((g): g is NonNullable<typeof g> => g !== null);
  const total = lignes.reduce((s, g) => s + g.priceCents, 0);

  if (!hasStripe) {
    for (const guide of lignes) {
      await recordPurchase({
        userId: user.id,
        guideId: guide.id,
        amountCents: guide.priceCents,
        currency: guide.currency,
      });
    }
    await viderPanier();
    revalidatePath("/account/guides");
    redirect(
      `/purchase/success?simule=1&guides=${lignes.map((g) => g.id).join(",")}`,
    );
  }

  const customerId = await ensureStripeCustomer(user.id, user.email, user.stripeCustomerId);

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    client_reference_id: user.id,
    metadata: {
      userId: user.id,
      kind: "guides",
      guideIds: lignes.map((g) => g.id).join(","),
      // Conservé pour les sessions à un seul article, lues par le webhook.
      guideId: lignes.length === 1 ? lignes[0].id : "",
    },
    payment_intent_data: {
      metadata: { userId: user.id, guideIds: lignes.map((g) => g.id).join(",") },
    },
    line_items: lignes.map((guide) => ({
      quantity: 1,
      price_data: {
        currency: guide.currency.toLowerCase(),
        unit_amount: guide.priceCents,
        product_data: {
          name: `Cronostic — ${guide.caliberName}`,
          description: guide.shortDescription ?? guide.title,
        },
      },
    })),
    success_url: `${siteUrl()}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl()}${annulation}`,
    locale: "fr",
  });

  void total;
  redirect(session.url!);
}

/* ────────────────────────────────────────────────────────────
   Abonnement Cronostic Pro
   ──────────────────────────────────────────────────────────── */

export async function startProCheckout(formData?: FormData) {
  const annuel = String(formData?.get("periode") ?? "mensuel") === "annuel";
  const user = await getCurrentUser();
  if (!user) redirect(signInPath("/pro"));

  const prix = annuel ? proAnnualPriceCents() : proPriceCents();

  if (!hasStripe) {
    const fin = new Date();
    if (annuel) fin.setFullYear(fin.getFullYear() + 1);
    else fin.setMonth(fin.getMonth() + 1);
    await upsertSubscription({
      userId: user.id,
      stripeSubscriptionId: null,
      stripeCustomerId: null,
      status: "active",
      priceCents: prix,
      currentPeriodEnd: fin,
      cancelAtPeriodEnd: false,
    });
    revalidatePath("/account/guides");
    redirect("/pro?simule=1");
  }

  const customerId = await ensureStripeCustomer(user.id, user.email, user.stripeCustomerId);
  const priceId = annuel
    ? process.env.STRIPE_PRO_ANNUAL_PRICE_ID
    : process.env.STRIPE_PRO_PRICE_ID;

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    metadata: { userId: user.id, kind: "subscription" },
    subscription_data: { metadata: { userId: user.id } },
    line_items: [
      priceId
        ? { price: priceId, quantity: 1 }
        : {
            quantity: 1,
            price_data: {
              currency: "eur",
              unit_amount: prix,
              recurring: { interval: annuel ? "year" : "month" },
              product_data: { name: `Cronostic Pro — ${annuel ? "annuel" : "mensuel"}` },
            },
          },
    ],
    success_url: `${siteUrl()}/pro?abonnement=succes`,
    cancel_url: `${siteUrl()}/pro`,
    locale: "fr",
  });

  redirect(session.url!);
}

/* ────────────────────────────────────────────────────────────
   Portail de facturation
   ──────────────────────────────────────────────────────────── */

export async function openBillingPortal() {
  const user = await getCurrentUser();
  if (!user) redirect(signInPath("/account"));

  if (!hasStripe) {
    const sub = await getSubscriptionForUser(user.id);
    if (sub) {
      await upsertSubscription({
        userId: user.id,
        stripeSubscriptionId: sub.stripeSubscriptionId,
        stripeCustomerId: null,
        status: "canceled",
        priceCents: sub.priceCents,
        currentPeriodEnd: sub.currentPeriodEnd,
        cancelAtPeriodEnd: true,
      });
    }
    revalidatePath("/account");
    redirect("/account?portail=simule");
  }

  const customerId = await ensureStripeCustomer(user.id, user.email, user.stripeCustomerId);
  const session = await stripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${siteUrl()}/account`,
    locale: "fr",
  });

  redirect(session.url);
}

/* ────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────── */

async function ensureStripeCustomer(
  userId: string,
  email: string,
  existing: string | null,
): Promise<string> {
  if (existing) return existing;
  const customer = await stripe().customers.create({ email, metadata: { userId } });
  await setUserStripeCustomer(userId, customer.id);
  return customer.id;
}
