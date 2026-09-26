import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

export const apiRateLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  limit: env.rateLimitMaxRequests,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: (request) => request.path === "/payments/webhook",
  message: { success: false, code: "TOO_MANY_REQUESTS", message: "Too many requests. Please try again later." },
});
