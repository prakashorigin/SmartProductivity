import mongoose from "mongoose";
import User from "../models/User.js";
import Task from "../models/Task.js";
import Project from "../models/Project.js";
import Session from "../models/Session.js";
import Subscription from "../models/Subscription.js";
import Notification from "../models/Notification.js";
import AuditLog from "../models/AuditLog.js";
import { getPlanLimits } from "../services/subscriptionService.js";
import { cancelStripeSubscriptionIfActive } from "../services/stripeService.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const validId = (id) => mongoose.isValidObjectId(id);

const recordAudit = async (req, action, targetType, targetId, metadata = {}) => {
  try {
    await AuditLog.create({
      actorId: req.user._id,
      actorRole: req.user.role,
      action,
      targetType,
      targetId: validId(targetId) ? targetId : null,
      metadata,
      ipAddress: String(req.ip || "").slice(0, 64),
    });
  } catch (error) {
    console.error(`[audit.${action}] ${error.name}.`);
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const query = {};
    if (req.query.search) {
      const matcher = new RegExp(escapeRegex(String(req.query.search).trim().slice(0, 100)), "i");
      query.$or = [{ name: matcher }, { email: matcher }];
    }
    if (["user", "admin", "superadmin"].includes(req.query.role)) query.role = req.query.role;
    if (["active", "suspended"].includes(req.query.status)) query.accountStatus = req.query.status;

    const [users, total] = await Promise.all([
      User.find(query).select("-password").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      User.countDocuments(query),
    ]);
    return res.json({ items: users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error(`[admin.users] ${error.name}.`);
    return res.status(500).json({ message: "We couldn't load users. Please try again." });
  }
};

export const getAllTasks = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const query = {};
    if (req.query.search) {
      const matcher = new RegExp(escapeRegex(String(req.query.search).trim().slice(0, 100)), "i");
      query.$or = [{ title: matcher }, { description: matcher }];
    }
    if (["Low", "Medium", "High", "Urgent"].includes(req.query.priority)) query.priority = req.query.priority;
    if (["todo", "in_progress", "completed"].includes(req.query.status)) query.status = req.query.status;
    const [items, total] = await Promise.all([
      Task.find(query).populate("userId", "name email").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Task.countDocuments(query),
    ]);
    return res.json({ items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error(`[admin.tasks] ${error.name}.`);
    return res.status(500).json({ message: "We couldn't load tasks. Please try again." });
  }
};

export const getAllSubscriptions = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const query = {};
    if (["pro", "premium"].includes(req.query.plan)) query.plan = req.query.plan;
    if (["active", "trialing", "past_due", "canceled", "incomplete", "unpaid"].includes(req.query.status)) query.status = req.query.status;
    const [items, total] = await Promise.all([
      Subscription.find(query).populate("userId", "name email").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Subscription.countDocuments(query),
    ]);
    return res.json({ items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error(`[admin.subscriptions] ${error.name}.`);
    return res.status(500).json({ message: "We couldn't load subscriptions. Please try again." });
  }
};

export const getAdminSettings = async (_req, res) => {
  return res.json({
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    billingConfigured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_PRO_PRICE_ID && process.env.STRIPE_PREMIUM_PRICE_ID),
    emailConfigured: Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM),
    freePlanLimits: getPlanLimits({ subscriptionPlan: "free", subscriptionStatus: "active" }),
    nodeEnvironment: process.env.NODE_ENV || "development",
  });
};

export const deleteUser = async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid user ID." });
  if (String(req.user._id) === req.params.id) return res.status(400).json({ message: "You cannot delete your own admin account here." });
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    if (user.role === "superadmin" && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Only a superadmin can manage a superadmin account." });
    }

    if (user.stripeSubscriptionId) {
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(503).json({ message: "This account has a Stripe subscription. Configure Stripe or cancel the subscription before deleting the account." });
      }
      await cancelStripeSubscriptionIfActive(user.stripeSubscriptionId);
    }

    await Promise.all([
      Task.deleteMany({ userId: user._id }),
      Project.deleteMany({ userId: user._id }),
      Session.deleteMany({ userId: user._id }),
      Notification.deleteMany({ userId: user._id }),
      Subscription.deleteMany({ userId: user._id }),
    ]);
    await User.findByIdAndDelete(user._id);
    await recordAudit(req, "user.delete", "User", user._id, { email: user.email });
    return res.json({ message: "User and associated productivity data deleted." });
  } catch (error) {
    console.error(`[admin.userDelete] ${error.name}.`);
    return res.status(500).json({ message: "We couldn't delete this user. Please try again." });
  }
};

export const getAdminAnalytics = async (_req, res) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const [totalUsers, activeUsers, newUsers, totalTasks, completedTasks, focusSummary, activeSubscriptions, revenueByCurrency] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ accountStatus: { $ne: "suspended" } }),
      User.countDocuments({ createdAt: { $gte: since } }),
      Task.countDocuments(),
      Task.countDocuments({ completed: true }),
      Session.aggregate([
        { $match: { type: { $in: ["focus", "study"] } } },
        { $group: { _id: null, minutes: { $sum: { $ifNull: ["$actualDuration", "$duration"] } }, count: { $sum: 1 } } },
      ]),
      Subscription.countDocuments({ status: { $in: ["active", "trialing"] } }),
      Subscription.aggregate([
        { $match: { status: { $in: ["active", "trialing"] } } },
        {
          $project: {
            currency: 1,
            monthlyAmount: {
              $switch: {
                branches: [
                  { case: { $eq: ["$interval", "day"] }, then: { $multiply: ["$unitAmount", 30] } },
                  { case: { $eq: ["$interval", "week"] }, then: { $multiply: ["$unitAmount", 4.345] } },
                  { case: { $eq: ["$interval", "year"] }, then: { $divide: ["$unitAmount", 12] } },
                ],
                default: "$unitAmount",
              },
            },
          },
        },
        { $group: { _id: "$currency", monthlyAmount: { $sum: "$monthlyAmount" } } },
      ]),
    ]);

    return res.json({
      totalUsers,
      activeUsers,
      newUsers,
      totalTasks,
      completedTasks,
      totalFocusMinutes: Number((focusSummary[0]?.minutes || 0).toFixed(1)),
      totalSessions: focusSummary[0]?.count || 0,
      activeSubscriptions,
      monthlyRevenue: revenueByCurrency.map((item) => {
        const currency = (item._id || "usd").toUpperCase();
        const fractionDigits = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits;
        return { currency, amount: Number((item.monthlyAmount / (10 ** fractionDigits)).toFixed(fractionDigits)) };
      }),
    });
  } catch (error) {
    console.error(`[admin.analytics] ${error.name}.`);
    return res.status(500).json({ message: "We couldn't load platform analytics. Please try again." });
  }
};

export const updateUserRole = async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid user ID." });
  const { role } = req.body ?? {};
  if (!["user", "admin", "superadmin"].includes(role)) return res.status(400).json({ message: "Choose a valid role." });
  if (String(req.user._id) === req.params.id) return res.status(400).json({ message: "You cannot change your own role." });

  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: "User not found." });
    const previousRole = target.role;
    target.role = role;
    await target.save();
    await recordAudit(req, "user.role.update", "User", target._id, { from: previousRole, to: role });
    return res.json(target.toObject({ transform: (_doc, value) => { delete value.password; return value; } }));
  } catch (error) {
    console.error(`[admin.userRole] ${error.name}.`);
    return res.status(500).json({ message: "We couldn't update this role. Please try again." });
  }
};

export const setUserSuspension = async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid user ID." });
  if (String(req.user._id) === req.params.id) return res.status(400).json({ message: "You cannot suspend your own account." });
  const suspended = req.body?.suspended;
  if (typeof suspended !== "boolean") return res.status(400).json({ message: "Choose whether the account should be suspended." });

  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: "User not found." });
    if (["admin", "superadmin"].includes(target.role) && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Only a superadmin can manage another administrator account." });
    }
    target.accountStatus = suspended ? "suspended" : "active";
    target.suspendedAt = suspended ? new Date() : null;
    target.suspensionReason = suspended ? String(req.body.reason || "").trim().slice(0, 500) : "";
    await target.save();
    await recordAudit(req, suspended ? "user.suspend" : "user.restore", "User", target._id, { reason: target.suspensionReason });
    return res.json({ _id: target._id, name: target.name, email: target.email, role: target.role, accountStatus: target.accountStatus, suspendedAt: target.suspendedAt });
  } catch (error) {
    console.error(`[admin.userStatus] ${error.name}.`);
    return res.status(500).json({ message: "We couldn't update this account. Please try again." });
  }
};

export const getAuditLogs = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
    const [items, total] = await Promise.all([
      AuditLog.find().populate("actorId", "name email role").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      AuditLog.countDocuments(),
    ]);
    return res.json({ items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error(`[admin.audit] ${error.name}.`);
    return res.status(500).json({ message: "We couldn't load audit logs." });
  }
};
