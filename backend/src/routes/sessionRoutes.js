import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  createSession,
  getSessions,
  getSessionAnalytics,
} from "../controllers/sessionController.js";

const router = express.Router();

router.get("/analytics", protect, getSessionAnalytics);

router.route("/").post(protect, createSession).get(protect, getSessions);

export default router;
