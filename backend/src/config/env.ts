import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

const positiveInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV?.trim() || "development",
  port: positiveInteger(process.env.PORT, 6000),
  mongoUri: process.env.MONGO_URI?.trim() || "",
  frontendUrl: process.env.FRONTEND_URL?.trim() || "http://localhost:4000",
  jwtSecret: process.env.JWT_SECRET?.trim() || "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN?.trim() || "30d",
  cookieSecure: process.env.COOKIE_SECURE === "true",
  rateLimitWindowMs: positiveInteger(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  rateLimitMaxRequests: positiveInteger(process.env.RATE_LIMIT_MAX_REQUESTS, 300),
});

export const assertRequiredEnvironment = (): void => {
  const missing = [
    ["MONGO_URI", env.mongoUri],
    ["JWT_SECRET", env.jwtSecret],
  ].filter(([, value]) => !value).map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variable${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. Set them in backend/.env.`);
  }
};
