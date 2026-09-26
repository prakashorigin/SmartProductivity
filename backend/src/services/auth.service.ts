import User, { type IUserDocument } from "../models/User.js";
import { comparePassword, hashPassword } from "../utils/password.js";

export interface CreateAccountInput {
  name: string;
  email: string;
  password: string;
}

export interface CurrentUserProfile {
  id: string;
  name: string;
  email: string;
  role: IUserDocument["role"];
  subscriptionPlan: IUserDocument["subscriptionPlan"];
  subscriptionStatus: IUserDocument["subscriptionStatus"];
  emailVerified: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class AuthServiceError extends Error {
  constructor(public readonly code: "EMAIL_IN_USE") {
    super("An account with this email address already exists. Try logging in instead.");
    this.name = "AuthServiceError";
  }
}

export const createAccount = async (input: CreateAccountInput): Promise<IUserDocument> => {
  if (await User.exists({ email: input.email })) throw new AuthServiceError("EMAIL_IN_USE");
  return User.create({
    name: input.name,
    email: input.email,
    password: await hashPassword(input.password),
    lastLogin: new Date(),
  });
};

export const authenticateCredentials = async (email: string, password: string): Promise<IUserDocument | null> => {
  const user = await User.findOne({ email }).select("+password +tokenVersion");
  if (!user || !(await comparePassword(password, user.password))) return null;
  user.lastLogin = new Date();
  await user.save();
  return user;
};

export const getCurrentUser = async (userId: string): Promise<CurrentUserProfile | null> => {
  const user = await User.findById(userId).select("name email role subscriptionPlan subscriptionStatus emailVerified lastLogin createdAt updatedAt");
  if (!user) return null;
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    subscriptionPlan: user.subscriptionPlan,
    subscriptionStatus: user.subscriptionStatus,
    emailVerified: user.emailVerified,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

export const invalidateUserSessions = async (userId: string): Promise<boolean> => {
  const user = await User.findById(userId).select("+tokenVersion");
  if (!user) return false;
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();
  return true;
};
