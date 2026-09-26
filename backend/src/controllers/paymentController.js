import Stripe from "stripe";
import mongoose from "mongoose";
import User from "../models/User.js";
import Subscription from "../models/Subscription.js";
import { getPlanLimits, getPlanSummary } from "../services/subscriptionService.js";

const planPriceIds = {
  pro: () => process.env.STRIPE_PRO_PRICE_ID,
  premium: () => process.env.STRIPE_PREMIUM_PRICE_ID,
};

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
};

const planFromPrice = (priceId) => {
  if (priceId && priceId === process.env.STRIPE_PREMIUM_PRICE_ID) return "premium";
  if (priceId && priceId === process.env.STRIPE_PRO_PRICE_ID) return "pro";
  return null;
};

const publicPlan = (plan, price) => {
  const limits = getPlanLimits({ subscriptionPlan: plan, subscriptionStatus: "active" });
  return {
    id: plan,
    name: plan[0].toUpperCase() + plan.slice(1),
    price: price ? { amount: price.unit_amount, currency: price.currency, interval: price.recurring?.interval || "month" } : null,
    configured: plan === "free" || Boolean(price),
    limits,
    features: plan === "free"
      ? [`Up to ${limits.tasks} tasks`, `${limits.projects} projects`, `${limits.focusSessionsPerDay} focus sessions per day`, `${limits.analyticsDays} days of analytics`]
      : plan === "pro"
        ? ["Unlimited tasks and projects", "Unlimited daily focus sessions", "90 days of analytics", "Custom Pomodoro durations"]
        : ["Everything in Pro", "Unlimited analytics history", "Advanced productivity insights", "Priority features"],
  };
};

export const getPlans = async (_req, res) => {
  const stripe = getStripe();
  const paidPlans = ["pro", "premium"];
  const prices = await Promise.all(paidPlans.map(async (plan) => {
    const priceId = planPriceIds[plan]();
    if (!stripe || !priceId) return [plan, null];
    try {
      return [plan, await stripe.prices.retrieve(priceId)];
    } catch {
      return [plan, null];
    }
  }));
  const priceMap = new Map(prices);
  return res.json([
    publicPlan("free", null),
    publicPlan("pro", priceMap.get("pro")),
    publicPlan("premium", priceMap.get("premium")),
  ]);
};

export const getCurrentSubscription = async (req, res) => {
  const [subscription, user] = await Promise.all([
    Subscription.findOne({ userId: req.user._id }).sort({ createdAt: -1 }).lean(),
    User.findById(req.user._id),
  ]);
  return res.json({ ...getPlanSummary(user), subscription: subscription || null });
};

export const createCheckoutSession = async (req, res) => {
  const plan = req.body?.plan;
  if (!Object.hasOwn(planPriceIds, plan)) {
    return res.status(400).json({ success: false, message: "Choose a valid paid plan." });
  }
  const stripe = getStripe();
  const priceId = planPriceIds[plan]();
  if (!stripe || !priceId) {
    return res.status(503).json({
      success: false,
      code: "STRIPE_NOT_CONFIGURED",
      message: "Online checkout is not configured yet. Add the Stripe secret and plan price IDs to backend/.env.",
    });
  }

  try {
    let customerId = req.user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: req.user.name,
        metadata: { userId: String(req.user._id) },
      });
      customerId = customer.id;
      await User.updateOne({ _id: req.user._id }, { $set: { stripeCustomerId: customerId } });
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:4000";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${frontendUrl}/pricing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/pricing?checkout=cancelled`,
      metadata: { userId: String(req.user._id), plan },
      subscription_data: { metadata: { userId: String(req.user._id), plan } },
    });
    return res.json({ url: session.url });
  } catch (error) {
    console.error(`[payments.checkout] ${error.type || error.name}.`);
    return res.status(502).json({ success: false, message: "We couldn't start checkout. Please try again." });
  }
};

export const createCustomerPortal = async (req, res) => {
  const stripe = getStripe();
  if (!stripe || !req.user.stripeCustomerId) {
    return res.status(503).json({
      success: false,
      code: "STRIPE_PORTAL_UNAVAILABLE",
      message: "A billing portal is available after a paid subscription is set up.",
    });
  }
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: req.user.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL || "http://localhost:4000"}/profile`,
    });
    return res.json({ url: session.url });
  } catch (error) {
    console.error(`[payments.portal] ${error.type || error.name}.`);
    return res.status(502).json({ success: false, message: "We couldn't open billing settings. Please try again." });
  }
};

const syncSubscription = async (stripe, stripeSubscription, userIdHint) => {
  const customerId = typeof stripeSubscription.customer === "string"
    ? stripeSubscription.customer
    : stripeSubscription.customer?.id;
  const price = stripeSubscription.items?.data?.[0]?.price;
  const metadataPlan = stripeSubscription.metadata?.plan;
  const plan = ["pro", "premium"].includes(metadataPlan) ? metadataPlan : planFromPrice(price?.id);
  if (!plan) throw new Error("Stripe subscription does not map to a configured plan.");
  const userId = userIdHint || stripeSubscription.metadata?.userId;
  const userQuery = userId && mongoose.isValidObjectId(userId)
    ? { _id: userId }
    : { stripeCustomerId: customerId };
  const user = await User.findOne(userQuery);
  if (!user) return;

  const allowedStatus = ["active", "trialing", "past_due", "canceled", "incomplete", "unpaid"];
  const status = allowedStatus.includes(stripeSubscription.status) ? stripeSubscription.status : "incomplete";
  const subscriptionStatus = status === "unpaid" ? "past_due" : status;
  const currentPeriodEnd = stripeSubscription.current_period_end
    ? new Date(stripeSubscription.current_period_end * 1000)
    : null;
  const effectivePlan = ["active", "trialing"].includes(subscriptionStatus) ? plan : "free";

  user.subscriptionPlan = effectivePlan;
  user.subscription = effectivePlan;
  user.subscriptionStatus = subscriptionStatus;
  user.stripeCustomerId = customerId || user.stripeCustomerId;
  user.stripeSubscriptionId = stripeSubscription.id;
  user.currentPeriodEnd = currentPeriodEnd;
  await user.save();

  await Subscription.updateOne(
    { stripeSubscriptionId: stripeSubscription.id },
    {
      $set: {
        userId: user._id,
        plan,
        status,
        stripeCustomerId: customerId,
        priceId: price?.id || "",
        currency: price?.currency || "usd",
        unitAmount: price?.unit_amount || 0,
        interval: price?.recurring?.interval || "month",
        currentPeriodEnd,
        canceledAt: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null,
      },
    },
    { upsert: true },
  );
};

export const stripeWebhook = async (req, res) => {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers["stripe-signature"];
  if (!stripe || !webhookSecret) {
    return res.status(503).json({ success: false, message: "Stripe webhooks are not configured." });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch {
    return res.status(400).json({ success: false, message: "Invalid Stripe webhook signature." });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const checkout = event.data.object;
      if (checkout.subscription) {
        const stripeSubscription = await stripe.subscriptions.retrieve(checkout.subscription);
        await syncSubscription(stripe, stripeSubscription, checkout.metadata?.userId);
      }
    } else if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) {
      await syncSubscription(stripe, event.data.object);
    } else if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription || invoice.parent?.subscription_details?.subscription;
      if (subscriptionId) {
        const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
        await syncSubscription(stripe, stripeSubscription);
      }
    }
    return res.json({ received: true });
  } catch (error) {
    console.error(`[payments.webhook] ${error.type || error.name}.`);
    return res.status(500).json({ success: false, message: "Webhook processing failed." });
  }
};
