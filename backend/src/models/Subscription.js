import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    plan: { type: String, enum: ["pro", "premium"], required: true },
    status: { type: String, enum: ["active", "trialing", "past_due", "canceled", "incomplete", "unpaid"], required: true },
    stripeCustomerId: { type: String, required: true, index: true },
    stripeSubscriptionId: { type: String, required: true, unique: true },
    priceId: { type: String, default: "" },
    currency: { type: String, default: "usd" },
    unitAmount: { type: Number, default: 0 },
    interval: { type: String, enum: ["day", "week", "month", "year"], default: "month" },
    currentPeriodEnd: { type: Date, default: null },
    canceledAt: { type: Date, default: null },
  },
  { timestamps: true },
);

subscriptionSchema.index({ userId: 1, status: 1, currentPeriodEnd: -1 });

export default mongoose.model("Subscription", subscriptionSchema);
