import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  createCheckoutSession,
  createCustomerPortal,
  getCurrentSubscription,
  getPlans,
} from "../controllers/paymentController.js";

const router = express.Router();

router.get("/plans", getPlans);
router.get("/subscription", protect, getCurrentSubscription);
router.post("/create-checkout-session", protect, createCheckoutSession);
router.post("/customer-portal", protect, createCustomerPortal);

export default router;
