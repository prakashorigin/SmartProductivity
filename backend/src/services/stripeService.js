import Stripe from "stripe";

export const cancelStripeSubscriptionIfActive = async (subscriptionId) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    const error = new Error("Stripe is not configured for subscription cancellation.");
    error.code = "STRIPE_NOT_CONFIGURED";
    throw error;
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  if (["canceled", "incomplete_expired"].includes(subscription.status)) return false;
  await stripe.subscriptions.cancel(subscriptionId);
  return true;
};
