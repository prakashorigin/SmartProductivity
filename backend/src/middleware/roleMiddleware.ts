import type { RequestHandler } from "express";
import type { UserRole } from "../models/User.js";

export const authorize = (...roles: UserRole[]): RequestHandler => (req, res, next) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Not authorized" });
    return;
  }
  if (!roles.includes(req.user.role)) {
    res.status(403).json({ success: false, message: "Access denied. Insufficient permissions." });
    return;
  }
  next();
};
