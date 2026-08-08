import "server-only";

import Stripe from "stripe";

import { hasStripe } from "./env";

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!hasStripe) {
    throw new Error("STRIPE_SECRET_KEY n'est pas définie.");
  }
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      appInfo: { name: "Cronostic" },
    });
  }
  return client;
}

export { hasStripe };
