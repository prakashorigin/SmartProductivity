import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";

type TokenUser = { _id: { toString(): string }; tokenVersion?: number } | string;

const generateToken = (user: TokenUser): string => {
  if (!env.jwtSecret) throw new Error("JWT_SECRET is not configured.");
  const id = typeof user === "string" ? user : user._id.toString();
  const version = typeof user === "string" ? 0 : Number(user.tokenVersion ?? 0);
  return jwt.sign({ id, version }, env.jwtSecret, { expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"] });
};

export default generateToken;
