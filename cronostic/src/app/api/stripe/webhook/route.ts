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
import { courrielAbonnement, courrielAchat } from "@/lib/mail";
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
  const userId = session.metadata?.userId ?? session.client_reference_id ?? null;
  if (!userId || session.payment_status !== "paid") return;

  // Une session peut porter plusieurs guides quand elle vient du panier.
  const ids = (session.metadata?.guideIds ?? session.metadata?.guideId ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0) return;

  const user = await findUserById(userId);
  if (!user) return;

  const achetes: { id: string; caliberReference: string }[] = [];
  for (const guideId of ids) {
    const guide = await getGuideById(guideId);
    if (!guide) continue;
    achetes.push({ id: guide.id, caliberReference: guide.caliberReference });
    await recordPurchase({
      userId: user.id,
      guideId: guide.id,
      // Le montant de la session couvre l'ensemble : on rattache à chaque
      // ligne son propre prix, seul montant qui ait un sens par guide.
      amountCents: guide.priceCents,
      currency: (session.currency ?? guide.currency).toUpperCase(),
      // La contrainte d'unicité porte sur cet identifiant : une session
      // multi-articles ne peut donc pas le porter pour chaque ligne.
      stripeCheckoutSessionId: ids.length === 1 ? session.id : null,
      stripePaymentIntentId:
        typeof session.payment_intent === "string" ? session.payment_intent : null,
    });
  }

  if (achetes.length > 0) {
    await courrielAchat(user.email, achetes, session.amount_total ?? 0);
  }
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
    plan: subscription.metadata?.plan === "integral" ? "integral" : "atelier",
    interval: item?.price?.recurring?.interval === "year" ? "year" : "month",
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });

  // Un seul message, à l'ouverture de l'abonnement : ni au renouvellement,
  // ni à la résiliation.
  if (subscription.status === "active" && subscription.metadata?.bienvenue !== "envoye") {
    await courrielAbonnement(
      user.email,
      subscription.metadata?.plan === "integral" ? "integral" : "atelier",
      item?.price?.recurring?.interval === "year" ? "year" : "month",
    );
    try {
      await stripe().subscriptions.update(subscription.id, {
        metadata: { ...subscription.metadata, bienvenue: "envoye" },
      });
    } catch {
      // Sans marquage, un renouvellement peut renvoyer le message : sans gravité.
    }
  }
}
