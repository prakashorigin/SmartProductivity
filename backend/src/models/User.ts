import mongoose, { type HydratedDocument, type Model, Schema } from "mongoose";

export type UserRole = "user" | "admin" | "superadmin";
export type SubscriptionPlan = "free" | "pro" | "premium";
export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "incomplete";
export type AccountStatus = "active" | "suspended";

export interface IUser {
  name: string;
  email: string;
  password: string;
  tokenVersion: number;
  passwordChangedAt: Date | null;
  passwordResetTokenHash: string | null;
  passwordResetExpiresAt: Date | null;
  emailVerified: boolean;
  emailVerificationTokenHash: string | null;
  emailVerificationExpiresAt: Date | null;
  role: UserRole;
  lastLogin: Date | null;
  subscription: SubscriptionPlan;
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: Date | null;
  accountStatus: AccountStatus;
  suspendedAt: Date | null;
  suspensionReason: string;
  createdAt: Date;
  updatedAt: Date;
}

export type IUserDocument = HydratedDocument<IUser>;

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, unique: true },
    password: { type: String, required: true, select: false },
    tokenVersion: { type: Number, default: 0, select: false },
    passwordChangedAt: { type: Date, default: null },
    passwordResetTokenHash: { type: String, default: null, select: false },
    passwordResetExpiresAt: { type: Date, default: null, select: false },
    emailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, default: null, select: false },
    emailVerificationExpiresAt: { type: Date, default: null, select: false },
    role: { type: String, enum: ["user", "admin", "superadmin"], default: "user" },
    lastLogin: { type: Date, default: null },
    subscription: { type: String, enum: ["free", "pro", "premium"], default: "free" },
    subscriptionPlan: { type: String, enum: ["free", "pro", "premium"], default: "free", index: true },
    subscriptionStatus: { type: String, enum: ["active", "trialing", "past_due", "canceled", "incomplete"], default: "active" },
    stripeCustomerId: { type: String, default: null, index: true },
    stripeSubscriptionId: { type: String, default: null, index: true },
    currentPeriodEnd: { type: Date, default: null },
    accountStatus: { type: String, enum: ["active", "suspended"], default: "active", index: true },
    suspendedAt: { type: Date, default: null },
    suspensionReason: { type: String, trim: true, maxlength: 500, default: "" },
  },
  { timestamps: true },
);

const User: Model<IUser> = (mongoose.models.User as Model<IUser> | undefined)
  ?? mongoose.model<IUser>("User", userSchema);

export default User;
