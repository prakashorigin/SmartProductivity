import type { ErrorRequestHandler } from "express";
import mongoose from "mongoose";

type HttpError = Error & { status?: number; statusCode?: number; code?: number | string; errors?: Record<string, { message?: string }> };

export const errorHandler: ErrorRequestHandler = (error: HttpError, _req, res, _next) => {
  if (error?.code === 11000) {
    res.status(409).json({ success: false, code: "DUPLICATE_VALUE", message: "That value is already in use." });
    return;
  }

  if (error instanceof mongoose.Error.ValidationError) {
    const firstError = Object.values(error.errors)[0];
    res.status(400).json({ success: false, code: "INVALID_INPUT", message: firstError?.message || "Check the information you entered." });
    return;
  }

  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({ success: false, code: "INVALID_JSON", message: "The request body contains invalid JSON." });
    return;
  }

  const status = error.statusCode ?? error.status;
  if (status && status >= 400 && status < 500) {
    res.status(status).json({ success: false, message: error.message || "The request could not be completed." });
    return;
  }

  if (error instanceof Error) console.error(`Unhandled API error (${error.name}).`);
  res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
};
