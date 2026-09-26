import mongoose from "mongoose";
import { createHash, randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import type { IUserDocument } from "../models/User.js";
import {
  authenticateCredentials,
  AuthServiceError,
  createAccount,
  getCurrentUser as readCurrentUser,
  invalidateUserSessions,
} from "../services/auth.service.js";
import { comparePassword, hashPassword } from "../utils/password.js";
import User from "../models/User.js";
import Task from "../models/Task.js";
import Project from "../models/Project.js";
import Session from "../models/Session.js";
import Notification from "../models/Notification.js";
import Subscription from "../models/Subscription.js";
import { sendAccountEmail } from "../services/emailService.js";
import { cancelStripeSubscriptionIfActive } from "../services/stripeService.js";
import generateToken from "../utils/generateToken.js";

const normalizeEmail = (email: unknown) => String(email ?? "").trim().toLowerCase();

const authUserResponse = (user: IUserDocument) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  emailVerified: Boolean(user.emailVerified),
  role: user.role,
  subscription: user.subscription,
  subscriptionPlan: user.subscriptionPlan || user.subscription || "free",
  subscriptionStatus: user.subscriptionStatus || "active",
  currentPeriodEnd: user.currentPeriodEnd || null,
  token: generateToken(user),
});

const isDuplicateEmailError = (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === 11000;
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const validPassword = (password: string) => password.length >= 8 && Buffer.byteLength(password, "utf8") <= 72;
const getErrorName = (error: unknown): string => error instanceof Error ? error.name : "Error";
const isLocalDevelopment = () => {
  if (process.env.NODE_ENV === "production") return false;
  try {
    const hostname = new URL(process.env.FRONTEND_URL || "http://localhost:4000").hostname;
    return ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
  } catch {
    return false;
  }
};
export const authValidation = { normalizeEmail, validPassword };

const createVerificationEmail = async (user: IUserDocument) => {
  const token = randomBytes(32).toString("hex");
  user.emailVerificationTokenHash = hashToken(token);
  user.emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();
  const url = `${process.env.FRONTEND_URL || "http://localhost:4000"}/verify-email/${token}`;
  const sent = await sendAccountEmail({
    to: user.email,
    subject: "Verify your SmartProductivity email",
    text: `Verify your email within 24 hours: ${url}`,
    html: `<p>Verify your SmartProductivity email within 24 hours:</p><p><a href="${url}">Verify email</a></p>`,
  });
  return { sent, url };
};

type AuthErrorContext = "register" | "login" | "profile";

const respondWithAuthError = (res: Response, error: unknown, context: AuthErrorContext) => {
  if (isDuplicateEmailError(error) || (error instanceof AuthServiceError && error.code === "EMAIL_IN_USE")) {
    return res.status(409).json({
      success: false,
      code: "EMAIL_IN_USE",
      message: "An account with this email address already exists. Try logging in instead.",
    });
  }

  if (error instanceof mongoose.Error.ValidationError) {
    const firstValidationError = Object.values(error.errors)[0];
    return res.status(400).json({
      success: false,
      code: "INVALID_INPUT",
      message: firstValidationError?.message || "Check the information you entered and try again.",
    });
  }

  const errorName = error instanceof Error ? error.name : "Error";
  console.error(`[auth.${context}] ${errorName}.`);

  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      code: "DATABASE_UNAVAILABLE",
      message: "The database is temporarily unavailable. Please try again in a moment.",
    });
  }

  return res.status(500).json({
    success: false,
    code: "AUTH_REQUEST_FAILED",
    message: `We couldn't ${
      context === "register"
        ? "create your account"
        : context === "login"
          ? "complete sign in"
          : "update your profile"
    } right now. Please try again.`,
  });
};

// POST /api/auth/register
export const registerUser = async (req: Request, res: Response) => {
  const name = String(req.body?.name ?? "").trim();
  const email = normalizeEmail(req.body?.email);
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      code: "REQUIRED_FIELDS",
      message: "Enter your name, email address, and password to create an account.",
    });
  }

  if (name.length < 2 || name.length > 80) {
    return res.status(400).json({
      success: false,
      code: "INVALID_NAME",
      message: "Your name must be between 2 and 80 characters.",
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return res.status(400).json({
      success: false,
      code: "INVALID_EMAIL",
      message: "Enter a valid email address.",
    });
  }

  if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
    return res.status(400).json({
      success: false,
      code: "INVALID_PASSWORD",
      message: "Choose a password with at least 8 characters and no more than 72 bytes.",
    });
  }

  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      code: "DATABASE_UNAVAILABLE",
      message: "The database is temporarily unavailable. Please try again in a moment.",
    });
  }

  try {
    const user = await createAccount({ name, email, password });

    let verificationEmailSent = false;
    try {
      verificationEmailSent = (await createVerificationEmail(user)).sent;
    } catch (error) {
      console.error(`[auth.verifyEmailSend] ${getErrorName(error)}.`);
    }

    return res.status(201).json({
      success: true,
      verificationEmailSent,
      ...authUserResponse(user),
    });
  } catch (error) {
    return respondWithAuthError(res, error, "register");
  }
};

// POST /api/auth/login
export const loginUser = async (req: Request, res: Response) => {
  const email = normalizeEmail(req.body?.email);
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      code: "REQUIRED_FIELDS",
      message: "Enter your email address and password to sign in.",
    });
  }

  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      code: "DATABASE_UNAVAILABLE",
      message: "The database is temporarily unavailable. Please try again in a moment.",
    });
  }

  try {
    const user = await authenticateCredentials(email, password);

    if (!user || !(await comparePassword(password, user.password))) {
      return res.status(401).json({
        success: false,
        code: "INVALID_CREDENTIALS",
        message: "That email and password combination was not recognized.",
      });
    }

    return res.json({ success: true, ...authUserResponse(user) });
  } catch (error) {
    return respondWithAuthError(res, error, "login");
  }
};

// GET /api/auth/profile
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: "Sign in to continue." });
    const user = await User.findById(req.user._id).select("name email emailVerified role subscription subscriptionPlan subscriptionStatus currentPeriodEnd accountStatus createdAt updatedAt lastLogin");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    return res.json(user);
  } catch (error) {
    return respondWithAuthError(res, error, "profile");
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, message: "Sign in to continue." });
  try {
    const user = await readCurrentUser(req.user._id.toString());
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    return res.json({ success: true, message: "Current user retrieved.", data: user });
  } catch (error) {
    return respondWithAuthError(res, error, "profile");
  }
};

export const logoutUser = async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, message: "Sign in to continue." });
  try {
    await invalidateUserSessions(req.user._id.toString());
    return res.json({ success: true, message: "You have been signed out." });
  } catch (error) {
    return respondWithAuthError(res, error, "profile");
  }
};

// PUT /api/auth/profile
export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: "Sign in to continue." });
    const user = await User.findById(req.user._id).select("+tokenVersion");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (typeof req.body?.name === "string" && req.body.name.trim()) {
      user.name = req.body.name.trim();
    }
    let emailChanged = false;
    if (typeof req.body?.email === "string" && req.body.email.trim()) {
      const email = normalizeEmail(req.body.email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
        return res.status(400).json({ success: false, code: "INVALID_EMAIL", message: "Enter a valid email address." });
      }
      if (email !== user.email) {
        user.email = email;
        user.emailVerified = false;
        user.emailVerificationTokenHash = null;
        user.emailVerificationExpiresAt = null;
        emailChanged = true;
      }
    }
    if (typeof req.body?.password === "string" && req.body.password) {
      if (!validPassword(req.body.password)) {
        return res.status(400).json({
          success: false,
          code: "INVALID_PASSWORD",
          message: "Choose a password with at least 8 characters and no more than 72 bytes.",
        });
      }
      user.password = await hashPassword(req.body.password);
      user.passwordChangedAt = new Date();
      user.tokenVersion = (user.tokenVersion || 0) + 1;
    }

    const updatedUser = await user.save();
    let verificationEmailSent;
    if (emailChanged) {
      try {
        verificationEmailSent = (await createVerificationEmail(updatedUser)).sent;
      } catch (emailError) {
        console.error(`[auth.verifyEmailSend] ${getErrorName(emailError)}.`);
        verificationEmailSent = false;
      }
    }
    return res.json({ success: true, verificationEmailSent, ...authUserResponse(updatedUser) });
  } catch (error) {
    return respondWithAuthError(res, error, "profile");
  }
};

export const requestPasswordReset = async (req: Request, res: Response) => {
  const email = normalizeEmail(req.body?.email);
  const genericMessage = "If an account exists for that email, we’ve sent password reset instructions.";
  if (!email || email.length > 254) return res.json({ success: true, message: genericMessage });

  try {
    const user = await User.findOne({ email });
    if (user) {
      const token = randomBytes(32).toString("hex");
      user.passwordResetTokenHash = hashToken(token);
      user.passwordResetExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await user.save();
      const url = `${process.env.FRONTEND_URL || "http://localhost:4000"}/reset-password/${token}`;
      try {
        await sendAccountEmail({
          to: user.email,
          subject: "Reset your SmartProductivity password",
          text: `Reset your password within 15 minutes: ${url}`,
          html: `<p>This password reset link expires in 15 minutes.</p><p><a href="${url}">Reset password</a></p>`,
        });
      } catch (error) {
        console.error(`[auth.resetEmail] ${getErrorName(error)}.`);
      }
    }
    return res.json({ success: true, message: genericMessage });
  } catch (error) {
    console.error(`[auth.requestReset] ${getErrorName(error)}.`);
    return res.json({ success: true, message: genericMessage });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const token = typeof req.params.token === "string" ? req.params.token : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return res.status(400).json({ success: false, message: "This password reset link is invalid or expired." });
  }
  if (!validPassword(password)) {
    return res.status(400).json({ success: false, message: "Choose a password with at least 8 characters and no more than 72 bytes." });
  }

  try {
    const user = await User.findOne({
      passwordResetTokenHash: hashToken(token),
      passwordResetExpiresAt: { $gt: new Date() },
    }).select("+passwordResetTokenHash +passwordResetExpiresAt +tokenVersion");
    if (!user) return res.status(400).json({ success: false, message: "This password reset link is invalid or expired." });

    user.password = await hashPassword(password);
    user.passwordChangedAt = new Date();
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    await user.save();
    return res.json({ success: true, message: "Your password has been reset. Sign in with your new password." });
  } catch (error) {
    console.error(`[auth.resetPassword] ${getErrorName(error)}.`);
    return res.status(500).json({ success: false, message: "We couldn't reset your password. Request a new link and try again." });
  }
};

export const requestEmailVerification = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: "Sign in to continue." });
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    if (user.emailVerified) return res.json({ success: true, message: "Your email is already verified." });
    const { sent, url } = await createVerificationEmail(user);
    const developmentLink = !sent && isLocalDevelopment() ? url : undefined;
    return res.json({
      success: true,
      emailSent: sent,
      verificationUrl: developmentLink,
      message: sent
        ? "Verification email sent. Check your inbox and spam folder."
        : developmentLink
          ? "Email delivery is not configured. Use this local development link to verify your account."
          : "Email delivery is not configured on this server. Ask the app administrator to configure SMTP_HOST and SMTP_FROM, then try again.",
    });
  } catch (error) {
    console.error(`[auth.requestVerification] ${getErrorName(error)}.`);
    return res.status(500).json({ success: false, message: "We couldn't send a verification link. Please try again." });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  const token = typeof req.params.token === "string" ? req.params.token : "";
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return res.status(400).json({ success: false, message: "This email verification link is invalid or expired." });
  }
  try {
    const user = await User.findOne({
      emailVerificationTokenHash: hashToken(token),
      emailVerificationExpiresAt: { $gt: new Date() },
    }).select("+emailVerificationTokenHash +emailVerificationExpiresAt");
    if (!user) return res.status(400).json({ success: false, message: "This email verification link is invalid or expired." });
    user.emailVerified = true;
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpiresAt = null;
    await user.save();
    return res.json({ success: true, message: "Email verified successfully." });
  } catch (error) {
    console.error(`[auth.verifyEmail] ${getErrorName(error)}.`);
    return res.status(500).json({ success: false, message: "We couldn't verify your email. Please try again." });
  }
};

export const deleteUserAccount = async (req: Request, res: Response) => {
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!password) return res.status(400).json({ success: false, message: "Enter your password to confirm account deletion." });

  try {
    if (!req.user) return res.status(401).json({ success: false, message: "Sign in to continue." });
    const user = await User.findById(req.user._id).select("+password");
    if (!user || !(await comparePassword(password, user.password))) {
      return res.status(401).json({ success: false, message: "Password confirmation failed." });
    }

    if (user.stripeSubscriptionId) {
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(503).json({ success: false, message: "Billing is configured for this account. Contact support to close the subscription before deleting the account." });
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
    await User.deleteOne({ _id: user._id });
    return res.json({ success: true, message: "Your account and productivity data have been deleted." });
  } catch (error) {
    const type = typeof error === "object" && error !== null && "type" in error ? String(error.type) : getErrorName(error);
    console.error(`[auth.deleteAccount] ${type}.`);
    return res.status(500).json({ success: false, message: "We couldn't delete the account. Please try again." });
  }
};
