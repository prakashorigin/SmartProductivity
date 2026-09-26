import jwt, { type JwtPayload } from "jsonwebtoken";
import type { RequestHandler } from "express";
import User from "../models/User.js";
import { env } from "../config/env.js";

type AccessTokenPayload = JwtPayload & { id?: string; version?: number };

const protect: RequestHandler = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, message: "Sign in to continue." });
    return;
  }

  try {
    if (!env.jwtSecret) throw new Error("JWT_SECRET is not configured.");
    const decoded = jwt.verify(authorization.slice(7), env.jwtSecret) as AccessTokenPayload;
    if (typeof decoded.id !== "string") throw new Error("Token subject is invalid.");

    const user = await User.findById(decoded.id).select("+tokenVersion");
    if (!user) {
      res.status(401).json({ success: false, message: "This account is no longer available. Please sign in again." });
      return;
    }
    if ((decoded.version ?? 0) !== (user.tokenVersion ?? 0)) {
      res.status(401).json({ success: false, message: "Your session ended because your password changed. Please sign in again." });
      return;
    }
    if (user.accountStatus === "suspended") {
      res.status(403).json({ success: false, message: "This account is suspended. Contact support for help." });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ success: false, message: "Your session is invalid or expired. Please sign in again." });
  }
};

export default protect;
