import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  registerUser,
  loginUser,
  getUserProfile,
  getCurrentUser,
  logoutUser,
  updateUserProfile,
  requestPasswordReset,
  resetPassword,
  requestEmailVerification,
  verifyEmail,
  deleteUserAccount,
} from "../controllers/auth.controller.js";
import protect from "../middleware/authMiddleware.js";
import { validateBody } from "../middleware/validateBody.middleware.js";
import { loginSchema, registerSchema } from "../validators/auth.validator.js";

const router = Router();
const authActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, code: "TOO_MANY_ATTEMPTS", message: "Too many account requests. Please wait 15 minutes and try again." },
});

router.post("/register", authActionLimiter, validateBody(registerSchema), registerUser);
router.post("/login", authActionLimiter, validateBody(loginSchema), loginUser);
router.post("/forgot-password", authActionLimiter, requestPasswordReset);
router.post("/reset-password/:token", authActionLimiter, resetPassword);
router.post("/verify-email/:token", authActionLimiter, verifyEmail);
router.post("/verify-email", protect, requestEmailVerification);
router.delete("/account", protect, deleteUserAccount);
router.get("/me", protect, getCurrentUser);
router.post("/logout", protect, logoutUser);
router.route("/profile").get(protect, getUserProfile).put(protect, updateUserProfile);

export default router;
