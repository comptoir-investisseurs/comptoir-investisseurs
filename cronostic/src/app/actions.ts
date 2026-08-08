"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser, signInPath } from "@/lib/auth";
import { proPriceCents, siteUrl } from "@/lib/env";
import {
  getGuideById,
  getSubscriptionForUser,
  recordPurchase,
  setUserStripeCustomer,
  upsertSubscription,
} from "@/lib/repo";
import { hasStripe, stripe } from "@/lib/stripe";

/* ────────────────────────────────────────────────────────────
   Achat d'un guide à l'unité
   ──────────────────────────────────────────────────────────── */

export async function startGuideCheckout(formData: FormData) {
  const guideId = String(formData.get("guideId") ?? "");
  const guide = await getGuideById(guideId);
  if (!guide) throw new Error("Guide introuvable.");

  const user = await getCurrentUser();
  if (!user) redirect(signInPath(`/purchase/guide/${guideId}`));

  if (!hasStripe) {
    // Sans clés Stripe, le parcours reste déroulable de bout en bout :
    // le droit est accordé immédiatement et clairement signalé comme simulé.
    await recordPurchase({
      userId: user.id,
      guideId: guide.id,
      amountCents: guide.priceCents,
      currency: guide.currency,
    });
    revalidatePath("/account/guides");
    redirect(`/purchase/success?guide=${guide.id}&simule=1`);
  }

  const customerId = await ensureStripeCustomer(user.id, user.email, user.stripeCustomerId);

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    client_reference_id: user.id,
    metadata: { userId: user.id, guideId: guide.id, kind: "guide" },
    payment_intent_data: {
      metadata: { userId: user.id, guideId: guide.id },
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: guide.currency.toLowerCase(),
          unit_amount: guide.priceCents,
          product_data: {
            name: `Cronostic — ${guide.caliberName}`,
            description: guide.shortDescription ?? guide.title,
          },
        },
      },
    ],
    success_url: `${siteUrl()}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl()}/calibres/${guide.caliberSlug}#guide`,
    locale: "fr",
  });

  redirect(session.url!);
}

/* ────────────────────────────────────────────────────────────
   Abonnement Cronostic Pro
   ──────────────────────────────────────────────────────────── */

export async function startProCheckout() {
  const user = await getCurrentUser();
  if (!user) redirect(signInPath("/pro"));

  if (!hasStripe) {
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    await upsertSubscription({
      userId: user.id,
      stripeSubscriptionId: null,
      stripeCustomerId: null,
      status: "active",
      priceCents: proPriceCents(),
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
    });
    revalidatePath("/account/guides");
    redirect("/pro?simule=1");
  }

  const customerId = await ensureStripeCustomer(user.id, user.email, user.stripeCustomerId);
  const priceId = process.env.STRIPE_PRO_PRICE_ID;

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
              unit_amount: proPriceCents(),
              recurring: { interval: "month" },
              product_data: { name: "Cronostic Pro" },
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
   Portail de facturation (renouvellement, résiliation, moyen de paiement)
   ──────────────────────────────────────────────────────────── */

export async function openBillingPortal() {
  const user = await getCurrentUser();
  if (!user) redirect(signInPath("/account"));

  if (!hasStripe) {
    // En mode simulé, la « résiliation » se contente de fermer l'abonnement local.
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
