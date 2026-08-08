import { NextResponse } from "next/server";
import type Stripe from "stripe";

import {
  findUserByStripeCustomer,
  findUserById,
  getGuideById,
  recordPurchase,
  setUserStripeCustomer,
  upsertSubscription,
} from "@/lib/repo";
import { hasStripe, stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/**
 * Webhook Stripe — source de vérité des droits.
 *
 * Achat unitaire, abonnement, renouvellement, résiliation et paiement échoué
 * passent tous par ici. Les écritures sont idempotentes : Stripe rejoue les
 * événements et l'utilisateur revient parfois sur la page de succès avant
 * l'événement.
 */
export async function POST(request: Request) {
  if (!hasStripe) {
    return NextResponse.json({ error: "Stripe n'est pas configuré." }, { status: 501 });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET manquant." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Signature absente." }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    return NextResponse.json(
      { error: `Signature invalide : ${error instanceof Error ? error.message : "inconnue"}` },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "payment") {
          await handleGuidePayment(session);
        } else if (session.mode === "subscription" && session.subscription) {
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          const subscription = await stripe().subscriptions.retrieve(subscriptionId);
          await handleSubscription(subscription, session.metadata?.userId ?? null);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await handleSubscription(event.data.object, null);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string | null };
        if (invoice.subscription) {
          const subscriptionId =
            typeof invoice.subscription === "string"
              ? invoice.subscription
              : (invoice.subscription as Stripe.Subscription).id;
          const subscription = await stripe().subscriptions.retrieve(subscriptionId);
          await handleSubscription(subscription, null);
        }
        break;
      }

      default:
        break;
    }
  } catch (error) {
    // 500 → Stripe rejouera l'événement.
    console.error("[stripe-webhook]", event.type, error);
    return NextResponse.json({ error: "Traitement en échec." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleGuidePayment(session: Stripe.Checkout.Session) {
  const guideId = session.metadata?.guideId;
  const userId = session.metadata?.userId ?? session.client_reference_id ?? null;
  if (!guideId || !userId) return;
  if (session.payment_status !== "paid") return;

  const [user, guide] = await Promise.all([findUserById(userId), getGuideById(guideId)]);
  if (!user || !guide) return;

  await recordPurchase({
    userId: user.id,
    guideId: guide.id,
    amountCents: session.amount_total ?? guide.priceCents,
    currency: (session.currency ?? guide.currency).toUpperCase(),
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId:
      typeof session.payment_intent === "string" ? session.payment_intent : null,
  });
}

async function handleSubscription(subscription: Stripe.Subscription, fallbackUserId: string | null) {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  const userId = subscription.metadata?.userId ?? fallbackUserId;
  let user = userId ? await findUserById(userId) : null;
  if (!user) user = await findUserByStripeCustomer(customerId);
  if (!user) return;

  if (!user.stripeCustomerId) await setUserStripeCustomer(user.id, customerId);

  const item = subscription.items.data[0];
  // `current_period_end` vit sur l'abonnement ou sur sa ligne selon la version d'API.
  const periodEnd =
    (subscription as unknown as { current_period_end?: number }).current_period_end ??
    (item as unknown as { current_period_end?: number } | undefined)?.current_period_end ??
    null;

  await upsertSubscription({
    userId: user.id,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: customerId,
    status: subscription.status,
    priceCents: item?.price?.unit_amount ?? null,
    currency: (item?.price?.currency ?? "eur").toUpperCase(),
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });
}
