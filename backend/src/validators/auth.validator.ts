import { z } from "zod";

const requiredString = (message: string) => z.preprocess(
  (value) => typeof value === "string" ? value : "",
  z.string().trim().min(1, message),
);

const emailSchema = requiredString("Enter a valid email address.")
  .pipe(z.string().email("Enter a valid email address.").max(254, "Email address is too long."))
  .transform((value) => value.toLowerCase());

const passwordSchema = requiredString("Enter your password.")
  .pipe(z.string().min(8, "Choose a password with at least 8 characters."))
  .refine((password) => Buffer.byteLength(password, "utf8") <= 72, "Password must not exceed 72 bytes.");

export const registerSchema = z.object({
  name: requiredString("Enter your name.").pipe(z.string().min(2, "Your name must be at least 2 characters.").max(80, "Your name must be no longer than 80 characters.")),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().optional(),
}).superRefine((data, context) => {
  if (data.confirmPassword !== undefined && data.confirmPassword !== data.password) {
    context.addIssue({ code: "custom", path: ["confirmPassword"], message: "The passwords do not match." });
  }
});

export const loginSchema = z.object({
  email: emailSchema,
  password: requiredString("Enter your password."),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
