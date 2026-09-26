import type { RequestHandler } from "express";
import type { ZodType } from "zod";

export const validateBody = (schema: ZodType): RequestHandler => (req, res, next) => {
  const result = schema.safeParse(req.body ?? {});
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    res.status(400).json({
      success: false,
      code: "VALIDATION_FAILED",
      message: result.error.issues[0]?.message || "Check the information you entered and try again.",
      errors,
    });
    return;
  }

  req.body = result.data;
  next();
};
