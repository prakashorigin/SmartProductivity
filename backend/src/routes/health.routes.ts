import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

router.get("/", (_req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    status: connected ? "ok" : "unavailable",
    database: connected ? "connected" : "disconnected",
    success: connected,
    message: "SmartProductivity API is running",
    data: {
      service: "SmartProductivity Backend",
      status: connected ? "healthy" : "unavailable",
      database: connected ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
